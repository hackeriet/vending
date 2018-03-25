const EventEmitter = require('events')
const execFile = require('child_process').execFile
const es = require('event-stream')

const log = require('./logger.js')

const BUTTON_SCRIPT = './bin/poll_pin.sh'
const PRESSED = 0

// Returns an EventEmitter that emits 'pressed' events with slot index
// as first argument.
module.exports = function (buttonPins) {
  const emitter = new EventEmitter()

  const procs = buttonPins.map((pin) => execFile(BUTTON_SCRIPT, [pin]))
  const streams = procs.map(btn => btn.stdout)

  // Read all stdout streams collectively
  es.merge(streams)
    .pipe(es.split())
    .pipe(es.map((line, next) => {
      log.log('keypad', line)

      const matches = line.toString().match(/Pin (\d+) state is (\d+)/i)

      if (matches) {
        const pin = Number(matches[1])
        const state = Number(matches[2])

        if (state === PRESSED) {
          const button = buttonPins.indexOf(pin)
          emitter.emit('pressed', button)
        }
      }

      next()
    }))

  // Let stderr bubble upwards
  es.merge(procs.map(p => p.stderr)).on('data', (data) => log.debug(data))

  return emitter
}

