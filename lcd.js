const dgram = require('dgram')

function LCD (address, port) {
  this.socket = dgram.createSocket('udp4')
  this.address = address
  this.port = port
}

LCD.prototype.print = async function (msg) {
  new Promise((resolve, reject) => {
    const buf = Buffer.from(msg)
    this.socket.send(buf, this.port, this.address, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

module.exports = LCD

