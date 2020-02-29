const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class Function extends Model {}
Function.init({
  id: {
    type: Sequelize.STRING,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  identifier: {
    type: Sequelize.STRING
  },
  version: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  contentType: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "text"
  },
  deps: {
    type: Sequelize.TEXT,
    defaultValue: "none"
  },
  handler: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  timeout: {
    type: Sequelize.STRING,
    defaultValue: "5000"
  },
  size: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  desc: {
    type: Sequelize.STRING
  },
  private: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
}, {
  sequelize,
  modelName: 'Function',
  freezeTableName: true,
});
Function.associate = models => {
  Function.belongsTo(models.User);
  Function.belongsTo(models.NameSpace);
  Function.belongsTo(models.Runtime);
  Function.belongsTo(models.DataSource);
  Function.hasMany(models.Report)
};
module.exports = Function;