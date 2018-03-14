class User {
  constructor (user) {
    this.name = user.name
    this.funds = user.funds
  }

  // https://node-postgres.com/features/queries
  static async findByCardId (cardId) {
    return new Promise((resolve) => {
      return resolve(new User({
        name: 'stig',
        funds: 100
      }))
    })
  }

  recordSale (item) {
    console.log('Recorded sale!', item)
  }
}

module.exports = User

