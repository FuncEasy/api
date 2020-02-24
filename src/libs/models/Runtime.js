const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class Runtime extends Model {}
Runtime.init({
  id: {
    type: Sequelize.STRING,
    allowNull: false,
    primaryKey: true,
  },
  lang: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  version: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  suffix: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  depsName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  depsLang: {
    type: Sequelize.STRING,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'Runtime',
  freezeTableName: true,
});
Runtime.associate = models => {
  Runtime.hasMany(models.Function);
};
module.exports = Runtime;