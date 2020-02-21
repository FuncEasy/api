const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const CheckAdmin = require('../../middleware/CheckAdmin');
const Models = require('../../libs/models');
let router = new Router();

router.post('/create', CheckLogin, CheckAdmin, async ctx => {
  let { lang, version } = ctx.request.body;
  if (!lang || !version) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:lang and version"
    };
    return;
  }
  let data = {
    id: uuidV4().replace(/\-/g, ''),
    lang,
    version,
  };
  let duplicate = await Models.Runtime.findOne({ where: {lang: data.lang, version: data.version} });
  if (duplicate) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:Runtime"
    };
    return;
  }
  await (async () => {
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let runtime = await Models.Runtime.create(data, {transaction});
      await transaction.commit();
      ctx.body = runtime;
    } catch (e) {
      await transaction.rollback();
      throw (e);
    }
  })();
});

router.get('/', CheckLogin, async ctx => {
  ctx.body = await Models.Runtime.findAll();
});

router.del('/:runtimeId', CheckLogin, CheckAdmin, async ctx =>{
  await Models.Runtime.destroy({where: {id: ctx.params.runtimeId}});
  ctx.body = "delete runtime success";
});

module.exports = router;