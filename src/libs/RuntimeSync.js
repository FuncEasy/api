const GateWayService = require('./GatewayService');
const uuidV4 = require('uuid/v4');
const Models = require('./models');
class RuntimeSync {
  constructor() {
    this.lastSyncTime = null
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new RuntimeSync();
    }
    return this._instance;
  }

  async sync(host, token) {
    if (this.lastSyncTime && +new Date() - this.lastSyncTime <= 5 * 60 * 1000) {
    } else {
      let config = await new GateWayService(host, token).ConfigGet();
      let runtime = config.config && config.config['runtime_list'];
      if (!runtime || runtime.length <= 0) return [];
      let runtimeList = JSON.parse(runtime);
      for (let i = 0; i < runtimeList.length; i++) {
        let name = runtimeList[i].name;
        let suffix = runtimeList[i].suffix;
        let depsName = runtimeList[i].depsName;
        let lang = runtimeList[i].lang;
        let depsLang = runtimeList[i].depsLang;
        if (runtimeList[i].version) {
          for (let j = 0; j < runtimeList[i].version.length; j++) {
            let version = runtimeList[i].version[j].version;
            let runtimeFound = await Models.Runtime.findOne({
              where: {name, version}
            });
            if (runtimeFound) {
              if (runtimeFound.suffix === suffix
                && runtimeFound.depsName === depsName
                && runtimeFound.lang === lang
                && runtimeFound.depsLang === depsLang) {
              } else {
                await runtimeFound.update({
                  suffix, depsName, lang, depsLang
                })
              }
            } else {
              await Models.Runtime.create({
                id: uuidV4(),
                name, suffix, depsName, lang, depsLang, version
              })
            }
          }
        }
      }
      this.lastSyncTime = +new Date()
    }
  }
}

module.exports = RuntimeSync;