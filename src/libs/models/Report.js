const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class Report extends Model {}
Report.init({
  type: {
    type: Sequelize.ENUM('speed', 'invoke'),
    allowNull: false,
  },
  handler: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  data: {
    type: Sequelize.TEXT
  }
}, {
  sequelize,
  modelName: 'Report',
  freezeTableName: true,
});
Report.associate = models => {
  Report.belongsTo(models.Function);
};
module.exports = Report;