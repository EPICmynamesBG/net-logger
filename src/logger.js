const winston = require('winston');

const formats = {
  txt: winston.format.printf(info => `${new Date().toISOString()} [${info.ip}] ${info.message}`.trim()),
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  )
}

/**
 * @param {string} filename
 * @param {string} filePath
 * @returns {winston.Logger}
 */
function getLogger(filename, filePath, format = 'json') {
  const useFormatter = formats[format];
  logger = winston.createLogger({
    level: 'silly',
    format: useFormatter,
    transports: [
      new winston.transports.File({ filename: `${filePath}/${filename}` }),
    ]
  });
  return logger;
}
