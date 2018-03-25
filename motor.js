const execa = require('execa')

module.exports = async function initMotor (motorPin, slotPins) {
  return function startMotor (slotIndex, cb) {
    const slot = slotPins[slotIndex]
    const args = [motorPin, slot]
    const opts = { timeout: 1000 * 10 }
    return execa('./bin/motor.sh', args, opts)
  }
}
