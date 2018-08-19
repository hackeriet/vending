const dgram = require('dgram')

module.exports = function (opts={}) {
  this._socket = opts._socket || dgram.createSocket('udp4')
  this.print = (msg) => new Promise((resolve, reject) => {
    this._socket.send(msg, opts.port, opts.address, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

