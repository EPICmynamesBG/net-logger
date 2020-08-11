const winston = require('winston');

const pingFormats = {
  txt: winston.format.printf(info => `${new Date().toISOString()} [${info.ip}] ${info.message}`.trim()),
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  )
};

const speedFormats = {
  txt: winston.format.printf(info => `${new Date().toISOString()} ${info.message}`.trim()),
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  )
};

/**
 * @param {string} filename
 * @param {string} filePath
 * @returns {winston.Logger}
 */
function getPingLogger(filename, filePath, format = 'json') {
  const useFormatter = pingFormats[format];
  logger = winston.createLogger({
    level: 'silly',
    format: useFormatter,
    transports: [
      new winston.transports.File({ filename: `${filePath}/${filename}` }),
    ]
  });
  return logger;
}

/**
 * @param {string} filename
 * @param {string} filePath
 * @returns {winston.Logger}
 */
function getSpeedLogger(filename, filePath, format = 'json') {
  const useFormatter = speedFormats[format];
  logger = winston.createLogger({
    level: 'silly',
    format: useFormatter,
    transports: [
      new winston.transports.File({ filename: `${filePath}/${filename}` }),
    ]
  });
  return logger;
}

module.exports = {
  getSpeedLogger,
  getPingLogger
};
