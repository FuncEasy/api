const sequelize = require('./sequelize');
const uuid = require('uuid/v4');
const crypto = require('crypto');
const Models = {
  APIToken: require('./APIToken'),
  Function: require('./Function'),
  NameSpace: require('./NameSpace'),
  Runtime: require('./Runtime'),
  User: require('./User'),
  DataSource: require('./DataSource'),
  Template: require('./Template'),
  Report: require('./Report'),
};
Object.keys(Models).forEach(key => {
  Models[key].associate(Models)
});

module.exports = {
  ...Models,
  sequelize,
  sync: async () => await sequelize.sync({alter: true}),
  root: async () => {
    let password = process.env.ROOT_PASSWORD || 'root';
    let username = process.env.ROOT_USERNAME || 'root';
    let sha256Pwd = crypto.createHash('sha256').update(password).digest('hex');
    let data = {
      id: uuid().replace(/\-/g, ''),
      username: username,
      access: 1,
      password: crypto.createHash('sha256').update(sha256Pwd).digest('hex'),
    };
    let duplicate = await Models.User.findOne({where: {username: 'root'}});
    if (!duplicate) await Models.User.create(data)
  }
};