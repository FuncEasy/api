const fs = require('fs');
const path = require('path');
module.exports = async function (ctx, next) {
  let tokenPath = "";
  if (process.env.NODE_ENV === 'dev') {
    tokenPath = path.join(__dirname, '..', '..', 'dev', 'gateway.token')
  } else {
    tokenPath = '/gateway_access/gateway.token'
  }
  ctx.GATEWAY_TOKEN = fs.readFileSync(tokenPath, 'utf8');
  ctx.GATEWAY_SERVICE = process.env.NODE_ENV === 'dev'
    ? '127.0.0.1:30123'
    : process.env.GATEWAY_SERVICE_HOST ? process.env.GATEWAY_SERVICE_HOST : 'gateway';
  return next()
};