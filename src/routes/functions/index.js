const Router = require('koa-router');
const client = require('request-promise');
const Log = require('../../lib/Log');
const CustomerScript = require('../../libs/CustomerScript');
const {
  FunctionStartJob,
  FunctionDeployJob,
  FunctionBuildJob,
  Pipeline,
} = require('../../lib/RemoteServiceJob');
let router = new Router();
const GatewayHost = process.env.GATEWAY_HOST || '127.0.0.1';
const GatewayPort = process.env.GATEWAY_PORT || 3001;
const Gateway = `${GatewayHost}:${GatewayPort}`;

// router.all('/:user/:ns/:funcName', async ctx => {
//   const ns = ctx.params.ns;
//   const funcName = ctx.params.funcName;
//   const user = ctx.params.user;
//   const url = `http://${Gateway}${ctx.request.url}`;
//   console.log(url);
//   try {
//     if(ctx.method === 'GET') {
//       ctx.body = await client({
//         url: url,
//         method: 'GET',
//         qs: ctx.query,
//         headers: {
//           "Content-Type": "application/json;charset=utf-8",
//           "User-Agent": 'Request-Promise',
//         },
//         json: true,
//       });
//     } else if (ctx.method === 'POST') {
//       ctx.body = await client({
//         url: url,
//         method: 'POST',
//         body: ctx.request.body,
//         headers: {
//           "Content-Type": "application/json;charset=utf-8",
//           "User-Agent": 'Request-Promise',
//         },
//         json: true,
//       });
//     }
//   } catch (e) {
//     ctx.status = 500;
//     ctx.body = `Invoke Function ${user}@${ns}::${funcName} failed! \n stack:${e.stack}`
//   }
// });
//
// router.get('/:user/:ns/:funcName/health', async ctx => {
//   const ns = ctx.params.ns;
//   const funcName = ctx.params.funcName;
//   const user = ctx.params.user;
//   const url = `http://${Gateway}${ctx.request.url}`;
//   try {
//     ctx.body = await client({
//       url: url,
//       method: 'GET',
//     });
//   } catch (e) {
//     ctx.status = 500;
//     ctx.body = `Function ${user}@${ns}::${funcName} is not running! \n stack:${e.stack}`
//   }
// });
//
// router.get('/:user/:ns/:funcName/metrics', async ctx => {
//   const ns = ctx.params.ns;
//   const funcName = ctx.params.funcName;
//   const user = ctx.params.user;
//   const url = `http://${Gateway}${ctx.request.url}`;
//   try {
//     ctx.contentType = 'application/json; charset=utf-8';
//     ctx.body = await client({
//       url: url,
//       method: 'GET',
//       headers: {
//         "Content-Type": "application/json;charset=utf-8",
//       },
//       json: true
//     });
//   } catch (e) {
//     ctx.status = 500;
//     ctx.body = `Function ${user}@${ns}::${funcName} is not running! \n stack:${e.stack}`
//   }
// });
//
// router.get('/:user/:ns/:funcName/logs', async ctx => {
//   const ns = ctx.params.ns;
//   const funcName = ctx.params.funcName;
//   const user = ctx.params.user;
//   const logObj = new Log(user, ns, funcName, '__read');
//   const list = logObj.list();
//   if(list.length === 0) {
//     ctx.status = 404;
//   } else {
//     ctx.body = list;
//   }
// });
//
// router.get('/:user/:ns/:funcName/logs/:filename', async ctx => {
//   const ns = ctx.params.ns;
//   const funcName = ctx.params.funcName;
//   const filename = ctx.params.filename;
//   const user = ctx.params.user;
//   const logObj = new Log(user, ns, funcName, '__read');
//   const data = logObj.readFile(filename);
//   if(!data) {
//     ctx.status = 404;
//   } else {
//     ctx.body = data;
//   }
// });
//
// router.post('/xxx', async ctx => {
//   let {user, namespace, funcName, version, runtime} = ctx.request.body;
//   let customerScript = new CustomerScript(user, namespace, funcName, version, runtime);
//   try {
//     await customerScript.saveUploadFile(ctx);
//     let scriptPath = await customerScript.processWithUploadFile();
//     let functionId = `${user}@${namespace}::${funcName}`;
//     let hexName = Buffer.from(functionId).toString('hex');
//     let buildName = `fusion_${hexName}`;
//     ctx.body = 'upload success';
//     let buildJob = new FunctionBuildJob({
//       scriptPath,
//       buildName,
//       buildArgs: JSON.stringify({name: functionId}),
//     });
//     let deployJob = new FunctionDeployJob({
//       containerName: buildName,
//       networkAlias: hexName,
//       force: true,
//     });
//     let startJob = new FunctionStartJob({});
//     let pipeline = new Pipeline('FunctionCreate').addStage('build', buildJob).addStage('deploy', deployJob).addStage('start', startJob);
//     pipeline.execute((err, data) => {
//       if (err) console.log('combine err', err);
//       console.log('combine res', data);
//     });
//     setInterval(() => {
//       console.log(pipeline.getPipelineState())
//     }, 1000);
//   } catch (e) {
//     throw e;
//   }
// });

module.exports = router;
