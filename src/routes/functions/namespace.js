const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const GatewayService = require('../../libs/GatewayService');
const GatewayOperateToken = require('../../middleware/GatewayOperateToken');
const Models = require('../../libs/models');
let router = new Router();

router.post('/create', CheckLogin, async ctx => {
  let { name, desc } = ctx.request.body;
  if (!name) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:name"
    };
    return;
  }
  let user = ctx.USER;
  let data = {
    id: uuidV4().replace(/\-/g, ''),
    name,
    desc,
  };
  let duplicate = await user.getNameSpaces({ where: {name: data.name} });
  if (duplicate.length > 0) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:namespace"
    };
  }
  await (async () => {
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let ns = await Models.NameSpace.create(data, {transaction});
      await ns.setUser(user, {transaction});
      await transaction.commit();
      ctx.body = ns;
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

router.get('/', CheckLogin, async ctx => {
  let user = ctx.USER;
  ctx.body = await user.getNameSpaces({
    include:[{
      model: Models.Function,
      as: 'Functions'
    }]
  });
});

router.get('/:nsId', CheckLogin, async ctx =>{
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
  ctx.body = res[0];
});

router.del('/:nsId', CheckLogin, GatewayOperateToken, async ctx => {
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
  let functions = await ns.getFunctions();
  let transaction = await Models.sequelize.transaction();
  try {
    for (let i = 0; i < functions.length; i++) {
      await functions[i].destroy({transaction});
      if (functions[i].status === 'deployed' || functions[i].status === 'redeploy') {
        await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).FunctionDelete(functions[i].id);
      }
    }
    await ns.destroy({transaction});
    await transaction.commit();
    ctx.body = "delete namespace success";
  } catch (e) {
    await transaction.rollback();
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

router.put('/:nsId', CheckLogin, async ctx => {
  let { name, desc } = ctx.request.body;
  if (!name) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:name"
    };
    return;
  }
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
  try {
    await ns.update({name, desc})
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});

module.exports = router;