const dgram = require('dgram')

function DatagramLCD (opts={}) {
  this.options = opts
  this._socket = opts._socket || dgram.createSocket('udp4')
}

DatagramLCD.prototype.print = function (msg) {
  return new Promise((resolve, reject) => {
    this._socket.send(msg, this.options.port, this.options.address, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

module.exports = DatagramLCD

