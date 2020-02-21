const Router = require('koa-router');
const moment = require('moment');
const uuid = require('uuid/v1');
const crypto = require('crypto');
const getClientIP = require('../../libs/GetClientIP');
const Models = require('../../libs/models');
let router = new Router();

router.post('/login', async (ctx, next) => {
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
  let user = await Models.User.findOne({where: {username: ctx.request.body.username}});
  if (!user) {
    ctx.status = 401;
    ctx.body = {
      err: "Incorrect: username or password",
      message: "Incorrect: username or password"
    };
  }
  else {
    let psw = crypto.createHash('sha256').update(ctx.request.body.password).digest('hex');
    if (user.password === psw) {
      let tokenData = {
        token: uuid(),
        ip: getClientIP(ctx.request),
        expired: moment().add(20, 'm').format('YYYY-MM-DD HH:mm:ss')
      };
      let token = await Models.APIToken.create(tokenData);
      await token.setUser(user);
      ctx.response.body = {user: {id: user.id, access: user.access, username: user.username}, api_token: token.token}
    } else {
      ctx.status = 401;
      ctx.body = {
        err: "Incorrect: username or password",
        message: "Incorrect: username or password"
      };
    }
  }
});

module.exports = router;