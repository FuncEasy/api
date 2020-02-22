const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const GatewayOperateToken = require('../../middleware/GatewayOperateToken');
const CustomerScript = require('../../libs/CustomerScript');
const GatewayService = require('../../libs/GatewayService');
const Models = require('../../libs/models');
let router = new Router();
router.post('/create', CheckLogin, async ctx => {
  let {
    name, desc, version, runtime_id, ns_id, handler, deps, data_source_id, timeout, size,
  } = ctx.request.body;
  if (!name || !version || !runtime_id || !ns_id || !handler) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:name, version, runtime_id, ns_id, handler"
    };
    return;
  }
  let _private = ctx.request.body.private;
  let user = ctx.USER;
  let namespaceArr = await user.getNameSpaces({ where: {id: ns_id} });
  if (namespaceArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Namespace"
    };
    return;
  }
  let namespace = namespaceArr[0];
  let runtime = await Models.Runtime.findOne({ where: {id: runtime_id} });
  if (!runtime) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Runtime"
    };
    return;
  }
  let dataSourceObj = null;
  if (data_source_id) {
    let dataSourceArr = await user.getDataSources({ where: {id: data_source_id} });
    if (dataSourceArr.length <= 0) {
      ctx.status = 404;
      ctx.body = {
        err: "Not Found",
        message: "NotFound:DataSource"
      };
      return;
    }
    dataSourceObj = dataSourceArr[0]
  }
  let data = {
    id: uuidV4().replace(/\-/g, ''),
    handler,
    name,
    desc,
    version,
    identifier: `${name}.${namespace.name}.${user.username}`,
    private: _private,
    status: 'basic',
  };
  if (deps) data.deps = deps;
  if (size) data.size = size;
  if (timeout) data.timeout = timeout;
  let duplicate = await namespace.getFunctions({ where: {identifier: data.identifier, version: data.version} });
  if (duplicate.length > 0) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:Function in name and version"
    };
    return;
  }
  await (async () => {
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let func = await Models.Function.create(data, {transaction});
      await func.setNameSpace(namespace, {transaction});
      await func.setUser(user, {transaction});
      await func.setRuntime(runtime, {transaction});
      if (dataSourceObj) {
        await func.setDataSource(dataSourceObj, {transaction});
      }
      await transaction.commit();
      ctx.body = func;
    } catch (e) {
      await transaction.rollback();
      ctx.status = 500;
      ctx.body = {
        err: e,
        message: "Server Error"
      };
    }
  })();
});

router.post('/scriptUpload/:funcId', CheckLogin, async ctx => {
  let funcId = ctx.params.funcId;
  let user = ctx.USER;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let func = funcArr[0];
  let contentType = ctx.request.files.file.type ? ctx.request.files.file.type : "application/text";
  let customerScript = new CustomerScript(funcId);
  try {
    await customerScript.saveUploadFile(ctx);
    await func.update({status: func.status === 'basic' ? 'uploaded' : 'redeploy', contentType});
    ctx.body = 'upload success';
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.get('/deploy/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let user = ctx.USER;
  let funcId = ctx.params.funcId;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let func = funcArr[0];
  const functionScriptBuffer = CustomerScript.getUploadedFile(func.id);
  const runtimeObj = await func.getRuntime();
  const dataSourceObj = await func.getDataSource();
  const functionObj = {
    id: func.id,
    function: functionScriptBuffer,
    identifier: func.identifier,
    version: func.version,
    runtime: `${runtimeObj.lang}:${runtimeObj.version}`,
    deps: func.deps,
    handler: func.handler,
    contentType: func.contentType === "application/zip" ? "zip" : "text",
    timeout: func.timeout || "5000",
    size: func.size || 1,
    dataSource: dataSourceObj ? dataSourceObj.id : null,
  };
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDeploy(functionObj);
    await func.update({status: "deployed"}, {transaction});
    await transaction.commit();
    ctx.body = "deploy success"
  } catch (e) {
    await transaction.rollback();
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.get('/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let funcId = ctx.params.funcId;
  let user = ctx.USER;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let funcObj = funcArr[0];
  let runtimeObj = await funcObj.getRuntime();
  let namespaceObj = await funcObj.getNameSpace();
  let dataSourceObj = await funcObj.getDataSource();
  try {
    let remote = await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionGet(funcId);
    ctx.body = {
      id: funcObj.id,
      namespace: namespaceObj.name,
      identifier: funcObj.identifier,
      version: funcObj.version,
      runtime: `${runtimeObj.lang}:${runtimeObj.version}`,
      handler: funcObj.handler,
      contentType: funcObj.contentType,
      timeout: funcObj.timeout,
      size: funcObj.size,
      dataSource: dataSourceObj.name,
      podStatus: remote.data.status.podStatus.map(podItem => ({
        podName: podItem.podName,
        podPhase: podItem.podPhase,
        initContainerStatuses: podItem.initContainerStatuses.map(initItem => ({
          name: initItem.name,
          ready: initItem.ready,
          restartCount: initItem.restartCount,
        })),
        containerStatuses: podItem.containerStatuses.map(item => ({
          name: item.name,
          state: item.state,
          ready: item.ready,
          restartCount: item.restartCount,
        })),
      }))
    };
  } catch (e) {
    console.log(e);
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.del('/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let funcId = ctx.params.funcId;
  let user = ctx.USER;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let funcObj = funcArr[0];
  try {
    await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDelete(funcId);
    await funcObj.destroy();
    ctx.body = "delete function success"
  } catch (e) {
    console.log(e);
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.put('/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let {
    name, desc, version, ns_id, deps, size, timeout, handler, data_source_id
  } = ctx.request.body;
  let funcId = ctx.params.funcId;
  let _private = ctx.request.body.private;
  let user = ctx.USER;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let funcObj = funcArr[0];
  let namespace;
  if (ns_id) {
    let namespaceArr = await user.getNameSpaces({ where: {id: ns_id} });
    if (namespaceArr.length <= 0) {
      ctx.status = 404;
      ctx.body = {
        err: "Not Found",
        message: "NotFound:Namespace"
      };
      return;
    }
    namespace = namespaceArr[0];
  } else {
    namespace = await funcObj.getNameSpace()
  }
  let dataSourceObj;
  if (data_source_id) {
    let dataSourceArr = await user.getDataSources({ where: {id: data_source_id} });
    if (dataSourceArr.length <= 0) {
      ctx.status = 404;
      ctx.body = {
        err: "Not Found",
        message: "NotFound:DataSource"
      };
      return;
    }
    dataSourceObj = dataSourceArr[0]
  }
  let patch = {};
  patch.identifier = `${name}.${namespace.name}.${user.username}`;
  if (name) {
    patch.name = name;
  }
  if (_private !== undefined) {
    patch.private = _private
  }
  if (version !== undefined) {
    patch.version = version;
  }
  if (deps !== undefined) {
    patch.deps = deps === "" ? "none" : deps;
    patch.status = "redeploy"
  }
  if (size !== undefined) {
    patch.size = size;
    patch.status = "redeploy"
  }
  if (desc !== undefined) {
    patch.desc = desc;
  }
  if (timeout) {
    patch.timeout = timeout;
    patch.status = "redeploy"
  }
  if (handler) {
    patch.handler = handler;
    patch.status = "redeploy"
  }
  if (data_source_id) {
    patch.status = "redeploy"
  }
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    if (ns_id) await funcObj.setNameSpace(namespace, {transaction});
    if (data_source_id) await funcObj.setDataSource(dataSourceObj, {transaction});
    await funcObj.update(patch, {transaction});
    await transaction.commit();
    ctx.body = funcObj;
  } catch (e) {
    await transaction.rollback();
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.get('/redeploy/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let user = ctx.USER;
  let funcId = ctx.params.funcId;
  let funcArr = await user.getFunctions({ where: {id: funcId} });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let func = funcArr[0];
  const functionScriptBuffer = CustomerScript.getUploadedFile(func.id);
  let decodeFunctionScript;
  if (func.contentType === "application/zip") {
    decodeFunctionScript = functionScriptBuffer.toString('base64')
  } else {
    decodeFunctionScript = functionScriptBuffer.toString('utf8')
  }
  const patchObj = {
    spec: {
      function: decodeFunctionScript,
      identifier: func.identifier,
      version: func.version,
      deps: func.deps,
      handler: func.handler,
      contentType: func.contentType === "application/zip" ? "zip" : "text",
      timeout: func.timeout,
      size: func.size || 1,
      dataSource: func.DataSourceId
    }
  };
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionUpdate(funcId, patchObj);
    await func.update({status: "deployed"}, {transaction});
    await transaction.commit();
    ctx.body = "deploy success"
  } catch (e) {
    await transaction.rollback();
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

module.exports = router;