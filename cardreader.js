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
  const cardreader = spawn('./nfcreader/nfcreader')
  logger.info('Card reader spawned')

  cardreader.stdout.on('data', (data) => {
    logger.debug('nfcreader: %s', data)
  })
  cardreader.stderr.on('data', (data) => {
    if (data.toString().startsWith('#')) {
      logger.debug('nfcreader: %s', data)
    } else {
      logger.error('nfcreader: %s', data);
    }
  })

  cardreader.on('error', (err) => logger.error('nfcreader process err: %s', err))
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
