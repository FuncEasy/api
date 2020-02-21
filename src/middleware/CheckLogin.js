const Models = require('../libs/models');
const moment = require('moment');
const getClientIP = require('../libs/GetClientIP');

module.exports = async function (ctx, next) {
  let token = ctx.request.headers['api-token'] || ctx.request.headers['Api-Token'];
  if (!token) {
    ctx.status = 401;
    ctx.body = {
      err: "Forbidden",
      message: "Need Login"
    };
    return;
  }
  let api_token = await Models.APIToken.findOne({where: {token: token}});
  if (!api_token) {
    ctx.status = 401;
    ctx.body = {
      err: "Forbidden",
      message: "Need Login"
    };
  }
  else {
    if ((api_token.expired && moment(api_token.expired).isAfter(moment())) &&
      api_token.ip === getClientIP(ctx.request)) {
      let user = await Models.User.findOne({where: {id: api_token.UserId}});
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          err: "Forbidden",
          message: "Need Login"
        };
      }
      else {
        ctx.USER = user;
        return next();
      }
    } else {
      ctx.status = 401;
      ctx.body = {
        err: "Forbidden",
        message: "Need Login"
      };
    }
  }
};