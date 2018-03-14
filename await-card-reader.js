class CardReader {
  constructor () {
    console.warn('Using a mocked CardReader')
  }

  async read () {
    const value = '0x767676'
    return new Promise(resolve => {
      setTimeout(() => resolve(value), 1250)
    })
  }
}

module.exports = CardReader

