/* ═══════════════════════════════════════════════
   ERROR HANDLER MIDDLEWARE
   Catches any error passed via next(err) and sends
   a clean, consistent JSON response
═══════════════════════════════════════════════ */

function errorHandler(err, req, res, next) {
  console.error(err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong on the server.',
  });
}

module.exports = errorHandler;