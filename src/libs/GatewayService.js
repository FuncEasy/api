const client = require('request-promise');
class GatewayService {
  constructor(serviceHost, token) {
    this.url = `http://${serviceHost}`;
    this.token = token;
  }

  FunctionDeploy(functionObj) {
    let decodeFunctionScript;
    if (functionObj.contentType === "zip") {
      decodeFunctionScript = functionObj.function.toString('base64')
    } else {
      decodeFunctionScript = functionObj.function.toString('utf8')
    }
    let options = {
      uri: `${this.url}/function/create/${functionObj.id}`,
      method: 'POST',
      headers: {
        "Authentication": this.token,
      },
      body: {
        name: functionObj.id,
        function: decodeFunctionScript,
        identifier: functionObj.identifier,
        version: functionObj.version,
        runtime: functionObj.runtime,
        deps: functionObj.deps,
        handler: functionObj.handler,
        contentType: functionObj.contentType,
        timeout: functionObj.timeout || 5000,
        size: functionObj.size || 1,
        dataSource: functionObj.dataSource || "",
      },
      json: true,
    };
    return client(options);
  }

  FunctionCall(funcId, data) {
    let options = {
      uri: `${this.url}/function/call/${funcId}`,
      method: 'POST',
      headers: {
        "Authentication": this.token,
      },
      body: data,
      json: true,
    };
    return client(options);
  }

  FunctionGet(funcId) {
    let options = {
      uri: `${this.url}/function/${funcId}`,
      headers: {
        "Authentication": this.token,
      },
      json: true,
    };
    return client(options);
  }

  FunctionUpdate(funcId, patch) {
    let options = {
      uri: `${this.url}/function/update/${funcId}`,
      headers: {
        "Authentication": this.token,
      },
      method: 'PUT',
      body: patch,
      json: true,
    };
    return client(options);
  }

  FunctionDelete(funcId) {
    let options = {
      uri: `${this.url}/function/delete/${funcId}`,
      headers: {
        "Authentication": this.token,
      },
      method: 'DELETE',
      json: true,
    };
    return client(options);
  }

  DataSourceCreate(dataSourceId, dataSourceDefine) {
    let options = {
      uri: `${this.url}/dataSource/create`,
      headers: {
        "Authentication": this.token,
      },
      method: 'POST',
      body: {
        dataSourceId,
        dataSourceDefine
      },
      json: true,
    };
    return client(options);
  }

  DataSourceUpdate(dataSourceId, dataSourceDefine) {
    let options = {
      uri: `${this.url}/dataSource/update`,
      headers: {
        "Authentication": this.token,
      },
      method: 'POST',
      body: {
        dataSourceId,
        dataSourceDefine
      },
      json: true,
    };
    return client(options);
  }

  DataSourceDelete(dataSourceId) {
    let options = {
      uri: `${this.url}/dataSource/${dataSourceId}`,
      headers: {
        "Authentication": this.token,
      },
      method: 'DELETE',
      json: true,
    };
    return client(options);
  }
}

module.exports = GatewayService;