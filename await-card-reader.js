class CardReader {
  constructor () {
    console.warn('Using a mocked CardReader')
  }

  async read () {
    const value = '0xf5e5b83e'
    return new Promise(resolve => {
      setTimeout(() => resolve(value), 1250)
    })
  }
}

module.exports = CardReader

