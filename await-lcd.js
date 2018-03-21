class LCD {
  constructor (lib) {
    this.ready = true
  }

  async waitReady () {
    if (this.ready)
      return Promise.resolve()

    // TODO ...
  }

  async write (msg) {
    console.log('LCD print:', msg)
    return Promise.resolve()
  }
}

module.exports = LCD

