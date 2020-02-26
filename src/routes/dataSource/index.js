const Router = require('koa-router');
const uuidV4 = require('uuid/v4');
const CheckLogin = require('../../middleware/CheckLogin');
const GatewayOperateToken = require('../../middleware/GatewayOperateToken');
const GatewayService = require('../../libs/GatewayService');
const Models = require('../../libs/models');
let router = new Router();

router.post('/create', CheckLogin, GatewayOperateToken, async ctx => {
  let { define, name } = ctx.request.body;
  if (!define || !name) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:define, name"
    };
    return;
  }
  let data = {
    id: uuidV4().replace(/\-/g, ''),
    define: JSON.stringify(define),
    name,
  };
  let duplicate = await ctx.USER.getDataSources({ where: {name: data.name} });
  if (duplicate.length > 0) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Duplicate:DataSource Name"
    };
    return;
  }
  await (async () => {
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let dataSource = await Models.DataSource.create(data, {transaction});
      await dataSource.setUser(ctx.USER, {transaction});
      await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).DataSourceCreate(data.id, define);
      await transaction.commit();
      ctx.body = dataSource;
    } catch (e) {
      await transaction.rollback();
      ctx.status = e.statusCode || 500;
      ctx.body = {
        err: e,
        message: "Server Error"
      };
    }
  })();
});
router.post('/update/:dataSourceId', CheckLogin, GatewayOperateToken, async ctx => {
  let { define, name } = ctx.request.body;
  if (!define || !name) {
    ctx.status = 422;
    ctx.body = {
      err: "Invalid Input",
      message: "Required:define, name"
    };
    return;
  }
  let dataSource = await ctx.USER.getDataSources({ where: {id: ctx.params.dataSourceId} });
  if (dataSource.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:DataSource"
    };
    return;
  }
  dataSource = dataSource[0];
  let transaction;
  try {
    transaction = await Models.sequelize.transaction();
    let res = await dataSource.update({name, define: JSON.stringify(define)}, {transaction});
    await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).DataSourceUpdate(ctx.params.dataSourceId, define);
    await transaction.commit();
    ctx.body = res
  } catch (e) {
    transaction.rollback();
    ctx.status = e.statusCode || 500;
    ctx.body = {
      err: e,
      message: "Server Error"
    };
  }
});
router.del('/:dataSourceId', CheckLogin, GatewayOperateToken, async ctx =>{
  const dataSources = await ctx.USER.getDataSources({where: {id: ctx.params.dataSourceId}});
  if (dataSources.length > 0) {
    let transaction;
    let dataSource = dataSources[0];
    try {
      transaction = await Models.sequelize.transaction();
      await dataSource.destroy({transaction});
      await new GatewayService(ctx.GATEWAY_SERVICE, ctx.GATEWAY_TOKEN).DataSourceDelete(ctx.params.dataSourceId);
      await transaction.commit();
      ctx.body = "delete data source success";
    } catch (e) {
      await transaction.rollback();
      ctx.status = e.statusCode || 500;
      ctx.body = {
        err: e.message,
        message: "Server Error"
      };
    }
  } else {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:DataSource"
    }
  }
});

router.get('/', CheckLogin, async ctx => {
  ctx.body = await ctx.USER.getDataSources({
    include: [{
      model: Models.Function,
      as: 'Functions'
    }]
  });
});

router.get('/:dataSourceId', CheckLogin, async ctx => {
  let dataSourceArr = await ctx.USER.getDataSources({
    where: {id: ctx.params.dataSourceId}
  });
  if (dataSourceArr.length <= 0) {
    ctx.status = 404;
    ctx.body = {
      err: "Not Found",
      message: "NotFound:DataSource"
    };
    return;
  }
  ctx.body = dataSourceArr[0]
});

module.exports = router;