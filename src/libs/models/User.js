const Sequelize = require('sequelize');
const sequelize = require('./sequelize');
const Model = Sequelize.Model;
class User extends Model {}
User.init({
  id: {
    type: Sequelize.STRING,
    allowNull: false,
    primaryKey: true,
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  access: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
  },
  email: {
    type: Sequelize.STRING,
  },
  functionToken: {
    type: Sequelize.STRING,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'User',
  freezeTableName: true,
});
User.associate = models => {
  User.hasMany(models.Function);
  User.hasMany(models.APIToken);
  User.hasMany(models.NameSpace);
  User.hasMany(models.DataSource);
  User.hasMany(models.Template);
};
module.exports = User;