const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const uuidV4 = require('uuid/v4');
class PresetTemplateLoad {
  constructor() {
    this.path = path.join(__dirname, '..', '..', 'presetTemplate');
    this.templates = [];
    this.lastLoadTime = null;
    this.load();
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new PresetTemplateLoad();
    }
    return this._instance;
  }

  load() {
    if (this.lastLoadTime && +new Date() - this.lastLoadTime <= 30 * 60 * 1000) return this.templates;
    this.templates = [];
    let files = fs.readdirSync(this.path);
    files.forEach(filename => {
      let filepath = path.join(this.path, filename);
      let stat = fs.statSync(filepath);
      if (stat.isFile()) {
        let res = yaml.safeLoad(fs.readFileSync(filepath));
        this.templates.push({
          id: uuidV4(),
          tag: "preset",
          name: res.name,
          desc: res.desc,
          template: res.template,
          deps: res.dependencies,
          runtime: res.runtime,
          version: res.version,
          handler: res.handler,
        });
      }
    });
    this.lastLoadTime = +new Date();
    return this.templates;
  }

  get(id) {
    return this.templates.find(item => item.id === id)
  }

  getAll(runtime, version) {
    return this.templates.filter(item => {
      if (item.runtime !== runtime) return false;
      let regx = /^([0-9]+|[0-9]+\.[0-9]+|[0-9]+\.[0-9]+\.[0-9]+|\*)-([0-9]+|[0-9]+\.[0-9]+|[0-9]+\.[0-9]+\.[0-9]+|\*)$/;
      let matchRes = item.version.match(regx);
      if (!matchRes) return false;
      let upper = matchRes[1];
      let lower = matchRes[2];
      let upperVersionCompare, lowerVersionCompare;
      if (upper === '*') {
         upperVersionCompare = 0;
      } else {
        upperVersionCompare = this.compareVersion(upper, version);
      }
      if (lower === '*') {
        lowerVersionCompare = 0;
      } else {
        lowerVersionCompare = this.compareVersion(version, lower);
      }
      return upperVersionCompare <= 0 && lowerVersionCompare <= 0;
    })
  }

  compareVersion(v1, v2) {
    let v1Arr = v1.split(".");
    let v2Arr = v2.split(".");
    let res = +v1Arr[0] - +v2Arr[0];
    return res === 0 && v1 !== v2 ? this.compareVersion(v1Arr.splice(1).join("."), v2Arr.splice(1).join(".")) : res;
  }
}

module.exports = PresetTemplateLoad;