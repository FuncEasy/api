module.exports = function (req) {
  let ip = req.ip || req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress || '';
  ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || ip;
  return ip;
};