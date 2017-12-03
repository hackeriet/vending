const assert = require('assert')
const execFile = require('child_process').execFile

const MOTOR_SCRIPT = './bin/motor.sh'

module.exports = function (motorPin, slotPins) {
  return (slotIndex, cb) => {
    const slot = slotPins[slotIndex]
    const args = [motorPin, slot]
    const opts = {timeout: 1000 * 10}

    return execFile(MOTOR_SCRIPT, args, opts, cb)
  }
}
