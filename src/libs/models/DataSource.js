const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class DataSource extends Model {}
DataSource.init({
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  define: {
    type: Sequelize.TEXT,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'DataSource',
  freezeTableName: true,
});
DataSource.associate = models => {
  DataSource.belongsTo(models.User);
  DataSource.hasMany(models.Function)
};
module.exports = DataSource;