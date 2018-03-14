class LCD {
  constructor (lib) {
    this.ready = false

    if (!lib) {
      lib = require('lcd')
      this.lcd = lib({
        rs: 45, e: 44, data: [66, 67, 68, 69], cols: 8, rows: 1
      })
      this.once('ready', () => {
        this.ready = true
      })
    } else {
      this.lcd = lib
      this.ready = true
    }
  }

  async waitReady () {
    if (this.ready)
      return Promise.resolve()

    return new Promise(resolve => this.lcd.once('ready', () => resolve()))
  }

  async write (msg) {
    return new Promise((resolve, reject) => {
      this.lcd.setCursor(0, 0)
      this.lcd.print(msg, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async clear () {
    return new Promise((resolve, reject) => {
      this.lcd.clear((err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  close () {
    this.lcd.close()
  }
}

module.exports = LCD

