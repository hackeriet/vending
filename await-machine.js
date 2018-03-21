class Machine {
  constructor () {
  }

  async vend () {
    console.log('vending')
    return Promise.resolve()
  }

  async waitSelection () {
    const mockedSelection = 4
    return new Promise(resolve => {
      setTimeout(() => resolve(mockedSelection), 1250)
    })
  }
}

module.exports = Machine

