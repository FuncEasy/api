const child = require('child_process');
const path = require('path');
const Log = require('./Log');
const CustomerScript = require('../libs/CustomerScript');

class Executor {
  constructor(type, name) {
    this.type = type;
    this.running = false;
    this.code = -1;
    this.deployName = `fusion-${this.encode(name)}`;
    this.logger = new Log(this.user, this.namespace, this.funcName, type);
    this.start = -1;
    this.duration = -1;
  }

  encode(name) {
    let reg = /^([a-zA-Z0-9]+)@([a-zA-Z0-9]+)::([a-zA-Z0-9]+)$/;
    let res = name.match(reg);
    if(!res) throw new Error('name is invalid');
    else {
      this.user = res[1];
      this.namespace = res[2];
      this.funcName = res[3];
      return Buffer.from(name).toString('hex');
    }
  }

  binding(runner) {
    this.logger.createFile(`<pre>`);
    return new Promise((resolve, reject) => {
      runner.stdout.on('data', data => {
        this.logger.createFile(`[${this.type} INFO] ${data}`);
      });

      runner.stderr.on('data', data => {
        this.logger.createFile(`[${this.type} ERROR] ${data}`);
      });
      runner.on('exit', code => {
        this.logger.createFile(`</pre>`);
        this.code = code;
        this.running = false;
        this.duration = +new Date() - this.start;
        if (code !== 0) reject(code);
        else resolve(code);
      });
    })
  }
}

class FuncDeploy extends Executor {
  constructor(name,
              uploadType,
              version,
              codeData,
              runtime,
              force,
              dockerfilesPath) {
    super('DEPLOY', name);
    this.version = version;
    this.uploadType = uploadType;
    this.codeData = codeData;
    this.runtime = runtime;
    this.force = force;
    this.dockerfilesPath = dockerfilesPath;
    this.codePath = path.join(__dirname,
      '..',
      '..',
      'uploadScripts',
      `${this.user}@${this.namespace}::${this.funcName}`,
      this.version,
      'code');
  }

  async execute(task) {
    this.running = true;
    this.start = +new Date();
    task.steps = {
      extract: -1,
      deploy: -1,
    };
    let customerScript = new CustomerScript(this.user,
      this.namespace,
      this.funcName,
      this.version,
      this.logger
      );
    this.logger.createFile(`<div style="color:orange">--> Extracting Upload Zip...</div>\n`);
    task.steps.extract = 0;
    if (this.uploadType === 'zip') {
      try {
        await customerScript.createWithUploadFileData();
        task.steps.extract = 1;
        this.logger.createFile(`<div style="color:green">--> Extracting Upload Zip Complete</div>\n`);
      } catch (e) {
        task.steps.extract = 2;
        this.logger.createFile(`<div style="color:red">--> Extracting Upload Zip Error!</div>\n`);
        return Promise.reject(e)
      }
    }
    const args = [
      'deploy',
      this.deployName,
      this.codePath,
      this.runtime,
      this.dockerfilesPath,
      this.force ? '-f' : '',
    ];
    task.steps.deploy = 0;
    this.logger.createFile(`<div style="color:orange">--> Deploying Function...</div>\n`);
    const runner = child.spawn('fusion', args);
    console.log(`execute: ${args.join(' ')}`);
    try {
      await this.binding(runner);
      task.steps.deploy = 1;
      this.logger.createFile(`<div style="color:green">--> Deploying Function Complete</div>\n`);
    } catch (e) {
      task.steps.deploy = 2;
      this.logger.createFile(`<div style="color:red">--> Deploying Function Error!</div>\n`);
      return Promise.reject(e);
    }
  }
}

class FuncDelete extends Executor {
  constructor(name) {
    super('DELETE', name);
  }
  execute() {
    this.running = true;
    this.start = +new Date();
    const args = [
      'delete',
      this.deployName,
    ];
    const runner = child.spawn('fusion', args);
    console.log(`execute: ${args.join(' ')}`);
    return this.binding(runner);
  }
}

module.exports = {
  FuncDeploy,
  FuncDelete,
};
