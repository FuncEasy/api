const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class APIToken extends Model {}
APIToken.init({
  token: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  ip: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  expired: {
    type: Sequelize.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'APIToken',
  freezeTableName: true,
});
APIToken.associate = models => {
  APIToken.belongsTo(models.User);
};
module.exports = APIToken;