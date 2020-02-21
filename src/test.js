// const { FuncDelete, FuncDeploy } = require('./lib/Executor');
// const Queue = require('./lib/ExecuteTaskQueue');
// const path = require('path');
// const deleteFunc1 = new FuncDelete(
//   'example@example::node',
// );
// const deployFunc1 = new FuncDeploy(
//   'example@example::node',
//   '/Users/chengziqian/projects/Fusion/runtime/nodejs/example',
//   'nodeJS',
//   true,
//   path.join(__dirname, '..', 'dockerfiles'),
// );
// Queue.getInstance().pushExecutor(deployFunc1);
// setInterval(() => console.log(Queue.getInstance().completeMap), 1000);

module.exports = {
  main: (event, context) => {
    return "hello!!!, I am Main!"
  }
};