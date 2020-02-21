const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
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
      throw (e);
    }
  })();
});

router.get('/', CheckLogin, async ctx => {
  let user = ctx.USER;
  ctx.body = await user.getNameSpaces();
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
  }
  ctx.body = res[0];
});

module.exports = router;