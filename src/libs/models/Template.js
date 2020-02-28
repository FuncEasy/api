const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class Template extends Model {}
Template.init({
  id: {
    type: Sequelize.STRING,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  desc: {
    type: Sequelize.STRING,
  },
  handler: {
    type: Sequelize.STRING,
  },
  template: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  deps: {
    type: Sequelize.TEXT,
    defaultValue: "none"
  },
  private: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'Template',
  freezeTableName: true,
});
Template.associate = models => {
  Template.belongsTo(models.User);
  Template.belongsTo(models.Runtime);
};
module.exports = Template;