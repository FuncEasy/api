const Models = require('../libs/models');
module.exports = async function (ctx, next) {
  let { username, nsName, funcName, version, } = ctx.params;
  let user = await Models.User.findOne({where: {username}});
  if (!user) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:User"
    };
    return;
  }
  let nsArr = await user.getNameSpaces({where: {name: nsName}});
  if (nsArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:NameSpace"
    };
    return;
  }
  let ns = nsArr[0];
  let funcArr = await ns.getFunctions({where:{name: funcName, version}});
  if (funcArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:Function"
    };
    return;
  }
  let func = funcArr[0];
  if (func.private) {
    let { token } = ctx.query;
    if (!token) token = ctx.request.body.token;
    if (!token) {
      if (funcArr.length <= 0) {
        ctx.status = 401;
        ctx.body = {
          err: "Forbidden",
          message: "Forbidden:Need Function Token"
        };
        return;
      }
      if (user.functionToken !== token) {
        ctx.status = 401;
        ctx.body = {
          err: "Forbidden",
          message: "Forbidden:Token Error"
        };
        return;
      }
    }
  }
  ctx.funcId = func.id;
  return next();
};