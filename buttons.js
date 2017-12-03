const EventEmitter = require('events')
const execFile = require('child_process').execFile
const es = require('event-stream')

const log = require('./logger.js')

const script = './bin/poll_pin.sh'
const PRESSED = 0

function buttonWatcher (pins) {
  const emitter = new EventEmitter()

  const procs = pins.map((p) => execFile(script, [p]))
  const streams = procs.map(p => p.stdout)

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
          const button = pins.indexOf(pin)
          emitter.emit('pressed', button)
        }
      }

      next()
    }))

  // Let stderr bubble upwards
  es.merge(procs.map(p => p.stderr)).on('data', (data) => log.debug(line))

  return emitter
}

module.exports = buttonWatcher
