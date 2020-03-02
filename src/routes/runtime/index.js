const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const CheckAdmin = require('../../middleware/CheckAdmin');
const GatewayOperateToken = require('../../middleware/GatewayOperateToken');
const RuntimeSync = require('../../libs/RuntimeSync');
const Models = require('../../libs/models');
let router = new Router();

router.get('/', CheckLogin, GatewayOperateToken, async ctx => {
  await RuntimeSync.getInstance().sync(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN);
  ctx.body = await Models.Runtime.findAll();
});

// router.post('/create', CheckLogin, CheckAdmin, async ctx => {
//   let { name, lang, version, suffix, depsName, depsLang } = ctx.request.body;
//   if (!lang || !version || !name || !suffix || !depsName || !depsLang) {
//     ctx.status = 422;
//     ctx.body = {
//       err: "Invalid Input",
//       message: "Required:lang and version"
//     };
//     return;
//   }
//   let data = {
//     id: uuidV4().replace(/\-/g, ''),
//     name,
//     lang,
//     version,
//     suffix,
//     depsName,
//     depsLang,
//   };
//   let duplicate = await Models.Runtime.findOne({ where: {lang: data.lang, version: data.version} });
//   if (duplicate) {
//     ctx.status = 422;
//     ctx.body = {
//       err: "Invalid Input",
//       message: "Duplicate:Runtime"
//     };
//     return;
//   }
//   let transaction;
//   try {
//     transaction = await Models.sequelize.transaction();
//     let runtime = await Models.Runtime.create(data, {transaction});
//     await transaction.commit();
//     ctx.body = runtime;
//   } catch (e) {
//     await transaction.rollback();
//     ctx.status = 500;
//     ctx.body = {
//       err: e,
//       message: "Server Error"
//     }
//   }
// });

// router.get('/:runtimeId', CheckLogin, CheckAdmin, async ctx => {
//   ctx.body = await Models.Runtime.findOne({ where: {id: ctx.params.runtimeId} });
// });
//
// router.put('/:runtimeId', CheckLogin, CheckAdmin, async ctx => {
//   let { name, lang, version, suffix, depsName, depsLang } = ctx.request.body;
//   if (!lang || !version || !name || !suffix || !depsName || !depsLang) {
//     ctx.status = 422;
//     ctx.body = {
//       err: "Invalid Input",
//       message: "Required:lang and version"
//     };
//     return;
//   }
//   let data = {
//     name,
//     lang,
//     version,
//     suffix,
//     depsName,
//     depsLang,
//   };
//   let runtime = await Models.Runtime.findOne({where: {id: ctx.params.runtimeId}});
//   if (!runtime) {
//     ctx.status = 404;
//     ctx.body = {
//       err: "Not Found",
//       message: "NotFound:Runtime"
//     };
//     return;
//   }
//   let transaction;
//   try {
//     transaction = await Models.sequelize.transaction();
//     runtime.update({data}, {transaction});
//     await transaction.commit();
//     ctx.body = runtime;
//   } catch (e) {
//     await transaction.rollback();
//     ctx.status = 500;
//     ctx.body = {
//       err: e,
//       message: "Server Error"
//     }
//   }
// });
//
// router.del('/:runtimeId', CheckLogin, CheckAdmin, async ctx =>{
//   await Models.Runtime.destroy({where: {id: ctx.params.runtimeId}});
//   ctx.body = "delete runtime success";
// });

module.exports = router;