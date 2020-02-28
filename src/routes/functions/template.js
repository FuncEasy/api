const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const PresetTemplateLoad = require('../../libs/PresetTemplateLoad');
const Models = require('../../libs/models');
let router = new Router();

router.post('/create', CheckLogin, async ctx => {
  let { name, template, deps, runtime_id, desc, handler } = ctx.request.body;
  if (!name || !template || !runtime_id || !handler) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:name, template, runtime"
    };
    return;
  }
  let _private = ctx.request.body.private;
  let user = ctx.USER;
  let data = {
    id: uuidV4().replace(/\-/g, ''),
    name,
    template,
    deps: deps ? deps : 'none',
    private: _private === 0 ? 0 : 1,
    desc: desc ? desc : '',
    handler: handler,
  };
  let duplicate = await user.getTemplates({ where: {name: data.name} });
  if (duplicate.length > 0) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:Template"
    };
  }
  let runtime = await Models.Runtime.findOne({ where: {id: runtime_id} });
  if (!runtime) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Runtime"
    };
    return;
  }
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    let template = await Models.Template.create(data, {transaction});
    await template.setUser(user, {transaction});
    await template.setRuntime(runtime, {transaction});
    await transaction.commit();
    ctx.body = template;
  } catch (e) {
    await transaction.rollback();
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.get('/', CheckLogin, async ctx => {
  let user = ctx.USER;
  ctx.body = await user.getTemplates({
    include:[{
      model: Models.Runtime,
      as: 'Runtime'
    }]
  });
});

router.get('/:templateId', CheckLogin, async ctx => {
  let user = ctx.USER;
  let templateArr = await user.getTemplates({
    where: {
      id: ctx.params.templateId
    },
    include:[{
      model: Models.Runtime,
      as: 'Runtime'
    }]
  });
  if (templateArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Template"
    };
    return;
  }
  ctx.body = templateArr[0];
});

router.get('/available/:runtimeId', CheckLogin, async ctx => {
  let runtime = await Models.Runtime.findOne({where: {id: ctx.params.runtimeId}});
  if (!runtime) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Namespace"
    };
    return;
  }
  let user = ctx.USER;
  let res = [];
  let publicTemplate = await runtime.getTemplates({where: {private: 0}});
  publicTemplate = publicTemplate.map(item => {
    item.dataValues.tag = 'public';
    return item;
  });
  res.push(...publicTemplate);
  let myTemplate = await user.getTemplates({where: {RuntimeId: runtime.id}});
  myTemplate = myTemplate.map(item => {
    item.dataValues.tag = 'my';
    return item;
  });
  console.log(myTemplate)
  res.push(...myTemplate);
  let preset = PresetTemplateLoad.getInstance().getAll(runtime.name, runtime.version);
  res.push(...preset);
  ctx.body = res;
});

router.del('/:templateId', CheckLogin, async ctx => {
  let user = ctx.USER;
  let res = await user.getTemplates({where: {id: ctx.params.templateId}});
  if (res.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Template"
    };
    return;
  }
  let template = res[0];
  let transaction = await Models.sequelize.transaction();
  try {
    await template.destroy({transaction});
    await transaction.commit();
    ctx.body = "delete template success";
  } catch (e) {
    await transaction.rollback();
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.put('/:templateId', CheckLogin, async ctx => {
  let { name, template, deps, runtime_id, desc, handler } = ctx.request.body;
  if (!name || !template || !runtime_id || !handler) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:name, template, runtime"
    };
    return;
  }
  let _private = ctx.request.body.private;
  let user = ctx.USER;
  let runtime = await Models.Runtime.findOne({ where: {id: runtime_id} });
  if (!runtime) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Runtime"
    };
    return;
  }
  let res = await user.getTemplates({where: {id: ctx.params.templateId}});
  if (res.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Template"
    };
    return;
  }
  let templateObj = res[0];
  let data = {
    name,
    template,
    desc: desc ? desc : '',
    handler: handler,
  };
  if (_private !== undefined) data.private = _private;
  if (deps !== undefined && deps !== templateObj.deps) data.deps = deps;
  let transaction = await Models.sequelize.transaction();
  try {
    await templateObj.update(data, {transaction});
    await templateObj.setRuntime(runtime, {transaction});
    await transaction.commit();
    ctx.body = "update template success";
  } catch (e) {
    await transaction.rollback();
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

module.exports = router;