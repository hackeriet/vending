const EventEmitter = require('events')
const { spawn } = require('child_process')
const es = require('event-stream')
const logger = require('./logger.js')

const cardIdPattern = /CARDSEEN: (0x[0-9a-f]{6,8})/i

// Return an emmiter that emits 'card' events when a card has been read
function cardReader () {
  const emitter = new EventEmitter()
  const cardreader = spawn('./nfcreader/nfcreader')

  // Forward output to debug log
  cardreader.stdout.on('data', (data) => logger.debug('cardreader out: ', data))
  cardreader.stderr.on('data', (data) => logger.debug('cardreader err: ', data))

  // Process output from script
  cardreader.stdout
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      const search = cardIdPattern.exec(line)

      if (search && search.length === 2) {
        const cardId = search[1]
        logger.info(`Card detected: ${cardId}`)
        emitter.emit('card', cardId)
      }

      next()
    }))

  return emitter
}

module.exports = cardReader
