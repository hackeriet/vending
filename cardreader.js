const EventEmitter = require('events')
const { spawn } = require('child_process')
const es = require('event-stream')

const log = require('./logger.js')

const script = './nfcreader/nfcreader'
const cardIdPattern = /CARDSEEN: (0x[0-9a-f]{6,8})/i

function cardReader () {
  const emitter = new EventEmitter()
  const cardreader = spawn(script)

  // Forward output to debug log
  cardreader.stdout.on('data', (data) => log.debug('cardreader out: ', data))
  cardreader.stderr.on('data', (data) => log.debug('cardreader err: ', data))

  cardreader.stdout
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      const search = cardIdPattern.exec(line)

      if (search && search.length === 2) {
        const cardId = search[1]
        log.info(`Card detected: ${cardId}`)
        emitter.emit('card', cardId)
      }

      next()
    }))

  return emitter
}

module.exports = cardReader
