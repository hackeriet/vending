const winston = require('winston')

const logger = new winston.Logger({
  level: 'debug',
  transports: [
    new (winston.transports.Console)({
      timestamp: () => Date.now(),
      colorize: 'all'
    })
  ]
})

module.exports = logger
