const client = require('request-promise');
const fs = require('fs');
class RemoteFunctionControllerService {
  constructor(host, port) {
    this.url = `http://${host}:${port}`
  }

  FunctionBuild({ scriptPath, buildName, buildArgs } = {}) {
    console.log(scriptPath);
    let options = {
      uri: `${this.url}/operateTask/buildFunction`,
      method: 'POST',
      formData: {
        buildName,
        buildArgs,
        file: {
          value: fs.createReadStream(scriptPath),
          options: {}
        }
      },
      json: true,
    };
    return client(options);
  }

  FunctionDeploy({ buildImageName, containerName, networkAlias, force } = {}) {
    let options = {
      uri: `${this.url}/operateTask/deployFunction`,
      method: 'POST',
      body: {
        buildImageName,
        containerName,
        networkAlias,
        force,
      },
      json: true,
    };
    return client(options);
  }

  FunctionStart( {containerId } = {}) {
    let options = {
      uri: `${this.url}/operateTask/startFunction`,
      method: 'POST',
      body: {
        containerId,
      },
      json: true,
    };
    return client(options);
  }

  TaskPolling(taskId) {
    let options = {
      uri: `${this.url}/taskPolling/${taskId}`,
      json: true,
    };
    return client(options);
  }

}

module.exports = RemoteFunctionControllerService;