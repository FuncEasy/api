module.exports = async function (ctx, next) {
  if (ctx.USER.access === 1) return next();
  else {
    ctx.status = 401;
    ctx.body = {
      err: "Forbidden",
      message: "Forbidden: Need Admin"
    }
  }
};