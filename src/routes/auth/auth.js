const Router = require('koa-router');
const CheckLogin = require('../../middleware/CheckLogin');
let router = new Router();

router.get('/', CheckLogin, async function (ctx, next) {
  let data = ctx.USER;
  delete data.dataValues['password'];
  ctx.response.status = 200;
  ctx.response.body = data;
});

module.exports = router;