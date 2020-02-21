const Router = require('koa-router');
const uuid = require('uuid/v4');
const crypto = require('crypto');
const getClientIP = require('../../libs/GetClientIP');
const Models = require('../../libs/models');
const moment = require('moment');
let router = new Router();

router.post('/register', async (ctx, next) => {
  let data = ctx.request.body;
  let { username, password } = data;
  if (username && password) return next();
  else {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:username, password"
    };
  }
}, async ctx => {
  let pwd = crypto.createHash('sha256').update(ctx.request.body.password).digest('hex');
  let data = {
    id: uuid().replace(/\-/g, ''),
    username: ctx.request.body.username,
    password: pwd,
  };
  if (await Models.User.findOne({ where: {username: data.username} })) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:username"
    };
  }
  let t = await Models.sequelize.transaction();
  await (async () => {
    try {
      let user = await Models.User.create(data, {transaction: t});
      let tokenData = {
        token: uuid(),
        ip: getClientIP(ctx.request),
        expired: moment().add(20, 'm').format('YYYY-MM-DD HH:mm:ss')
      };
      let token = await Models.APIToken.create(tokenData, {transaction: t});
      await token.setUser(user, {transaction: t});
      await t.commit();
      ctx.response.body = {api_token: token.token, user: {
          id: user.id,
          username: user.username,
        }};
    } catch (e) {
      console.log(e)
      await t.rollback();
    }
  })()
});

module.exports = router;