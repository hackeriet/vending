const execa = require('execa')

module.exports = function initMotor (motorPin, slotPins) {
  return function startMotor (slotIndex) {
    const slot = slotPins[slotIndex]
    const args = [motorPin, slot]
    const opts = { timeout: 1000 * 10 }
    return execa('./bin/motor.sh', args, opts)
  }
}
