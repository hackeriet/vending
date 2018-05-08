const request = require('superagent')
const logger = require('./logger.js')

class UserManager {
  // client should be a pg-promise shared connection object.
  // cardUsers should be an array of objects describing
  // authorized cardIds and their corresponding username.
  constructor (db, cardUsers) {
    this.db = db
    this.cardUsers = cardUsers
  }

  async getUsernameByCardId (cardId) {
    const card = this.cardUsers.find((card) => card.card_number === cardId)
    if (card) {
      return Promise.resolve(card.username)
    }
    else {
      return Promise.reject(new Error(`Card with id '${cardId}' not found`))
    }
  }

  async getUserAccountBalance (username) {
    return this.db.one(
        'SELECT SUM(value) FROM transactions WHERE username = $1',
        username
      )
      .then(result => result.sum)
  }

  async createVendUserIfNotExists (username) {
    const result = await this.db.oneOrNone(
      'SELECT username FROM users WHERE username = $1',
      username
    )
    if (!result) {
      const userId = await this.db.one(
        'INSERT INTO users(username, enabled, admin) VALUES($1, $2, $3) RETURNING uid',
        [username, 1, 0]
      )
      logger.debug(`Created username in database (${userId})`)
    } else {
      logger.debug('User already exists (which is a good thing)')
    }
  }

  async recordUserPurchase (username, amount, description) {
    if (amount < 0)
      return Promise.reject(new Error('Amount must be greater than 0'))

    // Make sure username exists before attempting to record a purchase.
    // If not, the user will not be deducted due to the transaction failing
    // due to a failed .one()-query
    await this.createVendUserIfNotExists(username)

    return this.db.tx(t => {
      return t.batch([
        t.one('SELECT uid FROM users WHERE username = $1', username),
        t.one(`INSERT INTO transactions(username, value, descr)
               VALUES ($1, $2, $3)
               RETURNING tid`,
               [username, -amount, description])
      ])
      .then(result => result[1].tid)
    })
  }
}

module.exports = UserManager

if (!module.parent) {
  const cardTestUsers = [
    { card_number: '0x1337', username: 'sshow' }
  ]

  ;(async function () {
    const pg = require('pg-promise')
    const cnn = {
      host: process.env.DB_HOST,
      port: 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      ssl: true,
      applicationName: 'vending'
    }
    const db = await pg()(cnn)
    await db.connect()
    logger.info('Connected to db')

    const mgr = new UserManager(db, cardTestUsers)

    const testUser = await mgr.getUsernameByCardId('0x1337')
    logger.info('Found a user!', testUser)

    const balance = await mgr.getUserAccountBalance(testUser)
    logger.info('Got balance!', balance)

    const res = await mgr.recordUserPurchase(testUser, 1, 'vend test')
    logger.info('Recorded a purchase with amount of 7. (tid=%s)', res)

    const newBalance = await mgr.getUserAccountBalance(testUser)
    logger.info('Got new balance!', newBalance)
  })()
}

