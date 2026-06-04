/**
 * Error Handler Helper
 * 
 * Memberikan error response yang konsisten dengan logging untuk debugging.
 */

/**
 * Handle error dalam route handler dan kirim response JSON yang konsisten.
 * 
 * @param {Error} error - Error object dari catch block
 * @param {object} req - Express request object (untuk context path/method)
 * @param {object} res - Express response object
 * @param {string} [customMessage='Terjadi kesalahan'] - Pesan error yang ditampilkan ke user
 * @param {number} [statusCode=500] - HTTP status code
 */
function handleError(error, req, res, customMessage = 'Terjadi kesalahan', statusCode = 500) {
  // Log error detail ke console untuk debugging
  console.error('========================================');
  console.error(`[${new Date().toISOString()}] ERROR: ${req.method} ${req.originalUrl}`);
  console.error(`  Message: ${error.message}`);
  console.error(`  Name: ${error.name}`);

  // Log SQL query jika ada (berguna untuk debug query error)
  if (error.sql) {
    console.error(`  SQL: ${error.sql}`);
  }
  if (error.sqlMessage) {
    console.error(`  SQL Message: ${error.sqlMessage}`);
  }
  if (error.code) {
    console.error(`  Error Code: ${error.code}`);
  }
  if (error.errno) {
    console.error(`  Errno: ${error.errno}`);
  }

  // Stack trace untuk error yang tidak terduga
  if (error.stack) {
    // Ambil 5 baris pertama stack trace
    const stackLines = error.stack.split('\n').slice(0, 6).join('\n');
    console.error(`  Stack:\n${stackLines}`);
  }

  console.error('========================================');

  // Build response object
  const response = {
    message: customMessage,
    error: error.message,
  };

  // Tambahkan info tambahan untuk debugging (hanya di non-production)
  if (process.env.NODE_ENV !== 'production') {
    if (error.code) response.error_code = error.code;
    if (error.errno) response.errno = error.errno;
    if (error.sqlMessage) response.sql_message = error.sqlMessage;
    if (error.sql) response.sql = error.sql;
    if (error.stack) response.stack = error.stack.split('\n').slice(0, 3).join('\n');
  }

  res.status(statusCode).json(response);
}

module.exports = { handleError };
