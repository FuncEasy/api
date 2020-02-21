const Router = require('koa-router');
const Function = require('./functions/function');
const DataSource = require('./dataSource');
const Runtime = require('./runtime');
const Namespaces = require('./functions/namespace');
const Register = require('./auth/register');
const Auth = require('./Auth/auth');
const Login = require('./Auth/login');
let router = new Router();
router.use('/runtime', Runtime.routes(), Runtime.allowedMethods());
router.use('/dataSource', DataSource.routes(), DataSource.allowedMethods());
router.use('/function', Function.routes(), Function.allowedMethods());
router.use('/namespace', Namespaces.routes(), Namespaces.allowedMethods());
router.use('/auth', Register.routes(), Register.allowedMethods());
router.use('/auth', Auth.routes(), Auth.allowedMethods());
router.use('/auth', Login.routes(), Login.allowedMethods());
module.exports = router;
