const uuid = require('uuid/v4');
class ExecuteTaskQueue {
  constructor() {
    this.queue = [];
    this.taskMap = {};
  }

  static getInstance() {
    if (!this.__instance) {
      this.__instance = new ExecuteTaskQueue();
    }
    return this.__instance;
  }

  pushExecutor(executor) {
    const id = uuid();
    this.queue.push({
      __executor: executor,
      id: id,
    });
    this.taskMap[id] = {
      status: 'pending',
      desc: 'pending',
    };
    if (this.queue.length !== 0 && this.queue[0].__executor === executor) {
      this.executeQueue();
    }
    return id;
  }

  async executeQueue() {
    if (this.queue.length === 0) return;
    const currentExecutor = this.queue[0];
    let task = this.taskMap[currentExecutor.id];
    try {
      this.taskMap[currentExecutor.id] = {
        ...task,
        status: 'running',
        desc: 'running',
      };
      await currentExecutor.__executor.execute(task);
      this.taskMap[currentExecutor.id] = {
        ...task,
        status: 'success',
        desc: 'success',
      };
    } catch (e) {
      console.log(e);
      this.taskMap[currentExecutor.id] = {
        ...task,
        status: 'failed',
        desc: 'failed',
      };
    }
    this.queue.shift();
    this.executeQueue();
  }
}

module.exports = ExecuteTaskQueue;
