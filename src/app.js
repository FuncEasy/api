const Koa = require('koa');
const router = require('./routes');
const koaBody = require('koa-body');
const logger = require('koa-logger');
const RefreshToken = require('./middleware/RefreshToken');
const Models = require('./libs/models');
const port = process.env.API_SERVICE_PORT || 8080;
const handler = async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    console.log(e);
    ctx.response.status = e.statusCode || e.status || 500;
    ctx.response.body = e
  }
};

try {
  (async () => {
    await Models.sync();
    const app = new Koa();
    app.use(koaBody({
      multipart: true,
      strict: false,
    }));
    app.use(logger());
    app.use(RefreshToken);
    app.use(handler);
    app.use(router.routes());
    app.listen(port);
    console.log(`API Listening port: ${port}`);
  })()
} catch (e) {
  console.log(e);
  process.exit(1)
}

