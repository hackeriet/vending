const EventEmitter = require('events')
const { spawn } = require('child_process')
const es = require('event-stream')
const logger = require('./logger.js')
const fs = require('fs')

const cardIdPattern = /CARDSEEN: (0x[0-9a-f]{6,8})/i

// Return an emitter that emits 'card' events when a card has been read.
function cardReader () {
  logger.info('Card reader called')
  const emitter = new EventEmitter()
  const cardreader = spawn('./nfcreader/nfcreader', {
	  stdio: [
		  0,
		  'pipe',
		  fs.openSync('err.out','w')
	  ]})
  logger.info('Card reader spawned')

  // Forward output to debug log
  cardreader.stdout.on('data', (data) => logger.debug('cardreader out: %s', data))
  //cardreader.stderr.on('data', (data) => logger.debug('cardreader err: %s', data))
  //cardreader.stderr.on('error', (data) => logger.error(data))

  cardreader.on('error', (err) => logger.error('cardreader sess err: %s', err))
  // Safeguarding in case of dead process
  cardreader.on('exit', (code, signal) => {
    logger.error('Cardreader exited. Restarting.')
    throw new Error('Cardreader exited.')
  })

  // Process output from script
  logger.info('processing card')
  cardreader.stdout
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      logger.info('Found a card')
      const search = cardIdPattern.exec(line)

      if (search && search.length === 2) {
        const cardId = search[1]
        logger.info(`Card detected: ${cardId}`)
        emitter.emit('card', cardId)
      }
      logger.info('calling next')

      next()
    }))

  return emitter
}

module.exports = cardReader
