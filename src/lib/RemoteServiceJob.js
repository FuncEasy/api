const RemoteFunctionControllerService = require('./RemoteFunctionControllerService');
const uuid = require('uuid/v4');
class RemoteServiceJob {
  constructor(type) {
    this.id = uuid();
    this.type = type;
    this.pollingInterval = 2000;
    this.service = new RemoteFunctionControllerService('127.0.0.1', 4002);
    this.remoteState = {
      id: '',
      status: 'waiting',
      result: ''
    };
  }

  getRemoteState() {
    return this.remoteState;
  }

  pollingCheck(taskId, callback) {
    let polling = setInterval(() => {
      this.service.TaskPolling(taskId).then(res => {
        console.log('polling check res: ' + taskId, res);
        this.remoteState = Object.assign({}, this.remoteState, res);
        if (this.remoteState.status === 'fail') {
          callback(res.result, null);
          clearInterval(polling);
        } else if (this.remoteState.status === 'success') {
          callback(null, res.result);
          clearInterval(polling);
        }
      }).catch(e => {
        console.log('polling check err', e);
        callback(e, null);
        clearInterval(polling);
      })
    }, this.pollingInterval)
  }

  execute() {};

}

class FunctionBuildJob extends RemoteServiceJob {
  constructor(ops) {
    super('build');
    this.ops = ops;
  }

  async execute(opts, callback) {
    try {
      this.ops = Object.assign({}, this.ops, opts);
      let { taskId } = await this.service.FunctionBuild({...this.ops});
      this.pollingCheck(taskId, callback);
    } catch (e) {
      console.log(e)
    }
  }
}

class FunctionDeployJob extends RemoteServiceJob {
  constructor(ops) {
    super('deploy');
    this.ops = ops;
  }

  async execute(opts, callback) {
    try {
      this.ops = Object.assign({}, this.ops, opts);
      let { taskId } = await this.service.FunctionDeploy({...this.ops});
      this.pollingCheck(taskId, callback);
    } catch (e) {
      console.log(e)
    }
  }
}

class FunctionStartJob extends RemoteServiceJob {
  constructor(ops) {
    super('build');
    this.ops = ops;
  }

  async execute(opts, callback) {
    try {
      this.ops = Object.assign({}, this.ops, opts);
      let { taskId } = await this.service.FunctionStart({...this.ops});
      this.pollingCheck(taskId, callback);
    } catch (e) {
      console.log(e)
    }
  }
}

class Pipeline {
  constructor(type) {
    this.id = uuid();
    this.type = type;
    this.time = +new Date();
    this.status = 'pending';
    this.firstStage = null;
    this.lastStage = this.firstStage;
    this.currentStage = this.firstStage;
  }

  createStageItem(name, job) {
    return {
      name: name,
      id: job.id,
      ops: job.ops,
      job: job,
      next: null
    }
  }

  addStage(name, job) {
    if (!this.firstStage) {
      this.firstStage = this.createStageItem(name, job);
      this.lastStage = this.firstStage;
      this.currentStage = this.firstStage;
      return this;
    }
    this.lastStage.next = this.createStageItem(name, job);
    this.lastStage = this.lastStage.next;
    return this;
  }

  getPipelineState() {
    let res = {
      id: this.id,
      type: this.type,
      time: this.time,
      stages: []
    };
    let currentStage = this.firstStage;
    while (currentStage) {
      res.stages.push({
        name: currentStage.name,
        state: {
          ...currentStage.job.getRemoteState()
        }
      });
      currentStage = currentStage.next;
    }
    return res;
  }

  execute(handle) {
    this.status = 'running';
    this.currentStage = this.firstStage;
    let cb = async (err, data) => {
      if (err) {
        this.status = 'fail';
        handle(err, null);
        return;
      }
      this.currentStage = this.currentStage.next;
      if (this.currentStage === null) {
        this.status = 'success';
        handle(null, this.getPipelineState());
        return;
      }
      this.currentStage.job.execute(Object.assign({}, this.currentStage.ops, data), cb);
    };
    this.currentStage.job.execute(this.currentStage.ops, cb);
  }
}

module.exports = {
  FunctionBuildJob,
  FunctionDeployJob,
  FunctionStartJob,
  RemoteServiceJob,
  Pipeline,
};

