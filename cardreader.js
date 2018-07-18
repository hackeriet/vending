const EventEmitter = require('events')
const { spawn } = require('child_process')
const es = require('event-stream')
const logger = require('./logger.js')
const fs = require('fs')
const { basename } = require('path')

const cardIdPattern = /CARDSEEN: (0x[0-9a-f]{6,8})/i

// Return an emitter that emits 'card' events when a card has been read.
function cardReader () {
  const emitter = new EventEmitter()
  const cardreader = spawn('./nfcreader/nfcreader')
  logger.debug('Card reader process spawned')

  cardreader.on('error', (err) => logger.error('Card reader process error: %s', err))
  cardreader.on('exit', (code, signal) => {
    // We now rely on the watchdog inside nfcreader program to handle this
    // service's lifecycle
    logger.error('Card reader process exited')
  })

  // Process output from script
  cardreader.stdout
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      logger.debug('nfcreader: %s', line)

      const search = cardIdPattern.exec(line)

      if (search && search.length === 2) {
        const cardId = search[1]
        logger.info(`Card detected: ${cardId}`)
        emitter.emit('card', cardId)
      }

      next()
    }))

  cardreader.stderr
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      if (line.toString().startsWith('#')) {
        logger.debug('nfcreader: %s', line)
      } else {
        logger.error('nfcreader: %s', line);
      }
      next()
    }))

  return emitter
}

module.exports = cardReader
