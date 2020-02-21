const path = require('path');
const fs = require('fs');
const logDir = path.join(__dirname, '..', '..', 'logs');
class Log {
  constructor(user, namespace, funcName, type) {
    this.time = +new Date();
    this.namespace = namespace;
    this.user = user;
    this.filename = `[${type}]${funcName}.${this.time}.log`;
    this.fileDir = path.resolve(logDir, `${this.user}@${this.namespace}`);
    this.filePath = path.resolve(logDir, `${this.user}@${this.namespace}`, this.filename);
  }

  createFile(data) {
    if (!fs.existsSync(this.fileDir)) {
      fs.mkdirSync(this.fileDir);
    }
    fs.appendFileSync(this.filePath, data, 'utf8');
  }

  list() {
    if (!fs.existsSync(this.fileDir)) {
      return [];
    } else {
      const dirList = fs.readdirSync(this.fileDir);
      dirList.filter(item => item.match(/^\[([A-Z]+)]([0-9a-zA-Z]+).(\d+).log$/)[2] === this.funcName);
      return dirList;
    }
  }

  readFile(filename) {
    const filePath = path.resolve(logDir, `${this.user}@${this.namespace}`, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    } else {
      return fs.readFileSync(filePath).toString();
    }
  }
}
module.exports = Log;
