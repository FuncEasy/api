const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class NameSpace extends Model {}
NameSpace.init({
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
  }
}, {
  sequelize,
  modelName: 'NameSpace',
  freezeTableName: true,
});
NameSpace.associate = models => {
  NameSpace.belongsTo(models.User);
  NameSpace.hasMany(models.Function);
};
module.exports = NameSpace;