const Models = require('../libs/models');
const moment = require('moment');
const getClientIP = require('../libs/GetClientIP');

module.exports = async function (ctx, next) {
  let token = ctx.request.headers['api-token'] || ctx.request.headers['Api-Token'];
  if (!token) return next();
  let api_token = await Models.APIToken.findOne({where: {token: token}});
  if (!api_token) return next();
  else {
    let user = await Models.User.findOne({where: {id: api_token.UserId}});
    if (!user) return next();
    else {
      if (user.id === api_token.UserId &&
        (api_token.expired === null || moment(api_token.expired).isAfter(moment())) &&
        api_token.ip === getClientIP(ctx.request)){
        api_token.expired =
          api_token.expired === null ? null : moment().add(20, 'm').format('YYYY-MM-DD HH:mm:ss');
        await api_token.save();
        return next();
      } else {
        return next();
      }
    }
  }
};