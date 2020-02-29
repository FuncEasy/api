const sequelize = require('./sequelize');
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
  sync: async () => await sequelize.sync({alter: true})
};