const client = require('request-promise');
class GatewayService {
  constructor(serviceHost, token) {
    this.url = `http://${serviceHost}`;
    this.token = token;
  }

  ConfigGet() {
    let options = {
      uri: `${this.url}/config/`,
      headers: {
        "Authentication": this.token,
      },
      json: true,
    };
    return client(options);
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

  FunctionCall(funcId, method, data) {
    let options;
    if (method === "GET") {
      options = {
        uri: `${this.url}/function/call/${funcId}`,
        method: 'GET',
        qs: {
          query: this.queryToString(data)
        },
        headers: {
          "Authentication": this.token,
        },
        json: true,
      };
    } else {
      options = {
        uri: `${this.url}/function/call/${funcId}`,
        method: 'POST',
        headers: {
          "Authentication": this.token,
        },
        body: data,
        json: true,
      };
    }
    return client(options);
  }

  FunctionGet(funcId) {
    let options = {
      uri: `${this.url}/function/instance/${funcId}`,
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

  FunctionLogs(funcId, lines) {
    let options = {
      uri: `${this.url}/function/logs/${funcId}`,
      headers: {
        "Authentication": this.token,
      },
      qs: {
        lines,
      },
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

  queryToString(query) {
    let arr = [];
    Object.keys(query).forEach(key => {
      arr.push(`${key}=${query[key]}`)
    });
    return arr.join("&")
  }
}

module.exports = GatewayService;