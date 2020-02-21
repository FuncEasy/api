const path = require('path');
const fs = require('fs');
const scriptDir = process.env.NODE_ENV === 'dev'
  ? path.join(__dirname, '..', '..', 'uploadScripts')
  : '/uploadScripts';
class CustomerScript {
  constructor(funcId) {
    this.scriptPath = path.join(scriptDir, `${funcId}.script`)
  }

  static getScriptPath(funcId) {
    return path.join(scriptDir, `${funcId}.script`)
  }

  static getUploadedFile(funcId, encode) {
    return fs.readFileSync(path.join(scriptDir, `${funcId}.script`), encode)
  }

  saveUploadFile(ctx) {
    return new Promise((resolve, reject) => {
      const file = ctx.request.files.file;
      const reader = fs.createReadStream(file.path);
      const upStream = fs.createWriteStream(this.scriptPath);
      reader.pipe(upStream);
      upStream.on('finish', () => {
        resolve()
      });
      upStream.on('error', (err) => {
        reject(err)
      });
    });
  }
}

module.exports = CustomerScript;