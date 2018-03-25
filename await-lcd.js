const dgram = require('dgram')

module.exports = function LCD (address, port) {
  const socket = dgram.createSocket('udp4')

  return {
    print: async (msg) => new Promise((resolve, reject) => {
      const buf = Buffer.from(msg)
      socket.send(buf, port, address, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}

