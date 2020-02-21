module.exports = async function (ctx, next) {
  if (ctx.USER.username === "root") return next();
  else {
    ctx.status = 401;
    ctx.body = {
      err: "Forbidden",
      message: "Forbidden: Need Admin"
    }
  }
};