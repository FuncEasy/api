const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const GatewayOperateToken = require('../../middleware/GatewayOperateToken');
const CustomerScript = require('../../libs/CustomerScript');
const GatewayService = require('../../libs/GatewayService');
const FunctionAccess = require('../../middleware/FunctionAccess');
const Report = require('../../libs/Report');
const Models = require('../../libs/models');
let router = new Router();
router.post('/create', CheckLogin, async ctx => {
  let {
    name, desc, version, runtime_id, ns_id, handler, deps, data_source_id, timeout, size, template
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
  if (template) {
    data.deps = template.deps ? template.deps : 'none';
    data.contentType = 'application/text';
    data.status = 'uploaded';
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
      if (template) {
        new CustomerScript(func.id).saveOnlineFile(template.template);
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
    await func.update({status: func.status === 'deployed' || func.status === 'redeploy' ? 'redeploy' : 'uploaded', contentType});
    ctx.body = 'upload success';
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.post('/scriptOnline/:funcId', CheckLogin, async ctx => {
  let funcId = ctx.params.funcId;
  let { script } = ctx.request.body;
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
  let contentType = "application/text";
  let customerScript = new CustomerScript(funcId);
  try {
    await customerScript.saveOnlineFile(script);
    await func.update({status: func.status === 'deployed' || func.status === 'redeploy' ? 'redeploy' : 'uploaded', contentType});
    ctx.body = 'upload success';
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e.message || '',
      message: "Server Error"
    };
  }
});

router.get('/script/:funcId', CheckLogin, async ctx => {
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
  let contentType, functionScriptBuffer, decodeFunctionScript;
  try {
    functionScriptBuffer = CustomerScript.getUploadedFile(func.id);
  } catch (e) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function Script"
    };
    return
  }
  if (func.contentType === "application/zip") {
    contentType = 'zip';
    decodeFunctionScript = functionScriptBuffer.toString('base64')
  } else {
    contentType = 'text';
    decodeFunctionScript = functionScriptBuffer.toString('utf8')
  }
  ctx.body = {
    contentType,
    decodeFunctionScript,
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
  const { force } = ctx.query;
  if (force !== undefined) {
    try {
      await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDelete(funcId);
    } catch (e) {
      ctx.status = e.statusCode || 500;
      ctx.body = {
        err: e,
        message: "Server Error"
      };
    }
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
    runtime: `${runtimeObj.name}:${runtimeObj.version}`,
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

router.get('/status/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
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
  try {
    let remote = await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionGet(funcId);
    ctx.body = {
      podStatus: remote.data.status.podStatus.map(podItem => ({
        podName: podItem.podName,
        podPhase: podItem.podPhase,
        initContainerStatuses: podItem.initContainerStatuses.map(initItem => ({
          name: initItem.name,
          ready: initItem.ready,
          state: initItem.state,
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

router.get('/logs/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
  let funcId = ctx.params.funcId;
  let {lines} = ctx.query;
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
  try {
    ctx.body = await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionLogs(funcId, lines);
  } catch (e) {
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
    if (funcObj.status === 'deployed' || funcObj.status === 'redeploy')
      await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDelete(funcId);
    await funcObj.destroy();
    ctx.body = "delete function success"
  } catch (e) {
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e.message,
      message: "Server Error"
    };
  }
});

router.del('/instance/:funcId', CheckLogin, GatewayOperateToken, async ctx => {
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
    await funcObj.update({status: "uploaded"});
    ctx.body = "delete function success"
  } catch (e) {
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
  let needRedeploy = false;
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
  if (deps !== undefined && deps !== funcObj.deps) {
    patch.deps = deps === "" ? "none" : deps;
    needRedeploy = true
  }
  if (size !== undefined && size !== funcObj.size) {
    patch.size = size;
    needRedeploy = true;
  }
  if (desc !== undefined) {
    patch.desc = desc;
  }
  if (timeout && timeout !== funcObj.timeout) {
    patch.timeout = timeout;
    needRedeploy = true;
  }
  if (handler && handler !== funcObj.handler) {
    patch.handler = handler;
    needRedeploy = true;
  }
  if (data_source_id && data_source_id !== funcObj.DataSourceId) {
    needRedeploy = true;
  }
  if (needRedeploy && funcObj.status === "deployed") {
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

router.get('/:nsId/functions', CheckLogin, async ctx => {
  let user = ctx.USER;
  let res = await user.getNameSpaces({where: {id: ctx.params.nsId}});
  if (res.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Namespace"
    };
    return;
  }
  let ns = res[0];
  let functions = await ns.getFunctions({
    include: [{
      model: Models.Runtime,
      as: 'Runtime',
    },{
      model: Models.DataSource,
      as: 'DataSource'
    }]
  });
  ctx.body = functions
});

router.get('/:funcId', CheckLogin, async ctx => {
  let funcId = ctx.params.funcId;
  let user = ctx.USER;
  let funcArr = await user.getFunctions({
    where: {id: funcId},
    include: [{
      model: Models.Runtime,
      as: 'Runtime',
    },{
      model: Models.DataSource,
      as: 'DataSource'
    },{
      model: Models.NameSpace,
      as: 'NameSpace'
    }]
  });
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  ctx.body = funcArr[0]
});

router.get('/call/:username/:nsName/:funcName/:version', FunctionAccess, GatewayOperateToken, async ctx => {
  let handler = ctx.query.handler ? ctx.funcObj.handler.split('.')[0] + '.' + ctx.query.handler : ctx.funcObj.handler;
  let report = new Report(ctx.funcId, ctx.funcObj);
  try {
    let beginTime = +new Date();
    let res = await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionCall(ctx.funcId, "GET" ,ctx.query);
    let endTime = +new Date();
    ctx.body = {
      data: res ? res.res : '// no data'
    };
    report.reportSpeed(handler, endTime - beginTime).then().catch(e => console.log(e));
    report.reportInvoke(handler, 1).then().catch(e => console.log(e))
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e.response.body.error,
      message: e.response.body.message
    };
    report.reportInvoke(handler, 0).then().catch(e => console.log(e))
  }
});

router.post('/call/:username/:nsName/:funcName/:version', FunctionAccess, GatewayOperateToken, async ctx => {
  let handler = ctx.request.body.handler ? ctx.funcObj.handler.split('.')[0] + '.' + ctx.request.body.handler : ctx.funcObj.handler;
  let report = new Report(ctx.funcId, ctx.funcObj);
  try {
    let beginTime = +new Date();
    let res = await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionCall(ctx.funcId, "POST", ctx.request.body);
    let endTime = +new Date();
    ctx.body = {
      data: res ? res.res : '// no data'
    };
    report.reportSpeed(handler, endTime - beginTime).then().catch(e => console.log(e));
    report.reportInvoke(handler, 1).then().catch(e => console.log(e))
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e.response.body.error,
      message: e.response.body.message
    };
    report.reportInvoke(handler, 0).then().catch(e => console.log(e))
  }
});

router.post('/access/token/create', CheckLogin, async  ctx => {
  let user = ctx.USER;
  let token = uuidV4();
  try {
    await user.update({functionToken: token});
    ctx.body = token;
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    }
  }
});

router.get('/access/token', CheckLogin, async ctx => {
  let user = ctx.USER;
  ctx.body = {
    token: user.functionToken,
    createdAt: user.updatedAt,
  }
});

router.get('/report/:funcId', CheckLogin, async ctx => {
  let user = ctx.USER;
  let funcId = ctx.params.funcId;
  let funcArr = await user.getFunctions({where: {id: funcId}});
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let functionObj = funcArr[0];
  let report = new Report(funcId, functionObj);
  try {
    let daysSpeedReports = await report.getReportTailDays('speed');
    let daysInvokeReports = await report.getReportTailDays('invoke');
    let weeksSpeedReports = await report.getReportByTailWeek('speed');
    let weeksInvokeReports = await report.getReportByTailWeek('invoke');
    ctx.body = {
      daysReport: {
        daysSpeedReports,
        daysInvokeReports,
      },
      weeksReport: {
        weeksSpeedReports,
        weeksInvokeReports,
      }
    }
  } catch (e) {
    console.log(e);
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    }
  }
});

module.exports = router;