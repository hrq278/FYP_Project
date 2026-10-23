// Express 4 doesn't catch errors thrown by async handlers; an uncaught rejection would crash the process.
// Wrapping them passes the error to the error middleware in app.js instead (500 with a message).
module.exports = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
