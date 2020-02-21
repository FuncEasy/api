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
    dataSourceObj = await Models.DataSource.findByPk(data_source_id);
    if (!dataSourceObj) {
      ctx.status = 404;
      ctx.body = {
        err: "Not Found",
        message: "NotFound:DataSource"
      };
      return;
    }
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
    await func.update({status: 'uploaded', contentType});
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
    dataSource: dataSourceObj.id,
  };
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    await func.update({status: "deployed"}, {transaction});
    await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDeploy(functionObj);
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