const { Sequelize } = require('sequelize');
const username = process.env.DATABASE_USER || 'root';
const password = process.env.DATABASE_PASSWORD || 'administrator';
const host = process.env.DATABASE_HOST || 'localhost';
const sequelize = new Sequelize('funceasy_web', username, password, {
  host: host,
  dialect: 'mysql',
  port: 3306,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
module.exports = sequelize;