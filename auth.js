const pg = require('pg-promise')
const request = require('superagent')
const pkg = require('./package.json')

const cnn = {
  host: 'matrix.hackeriet.no',
  port: 5432,
  database: 'brus',
  user: 'vending',
  password: process.env.DB_PASS,
  ssl: true,
  applicationName: pkg.name
}
const db = pg()(cnn)

const cardUsers = []
updateCardUsers()

// Update cards every minute
setInterval(() => updateCardUsers(), 60 * 1000)

function updateCardUsers () {
  request
    .get(process.env.CARDS_ENDPOINT)
    .auth(process.env.HTTP_USER, process.env.HTTP_PASS)
    .set('Accept', 'application/json')
    .then((res) => {
      const newcards = res.data
      if (typeof newcards !== 'object' || !Array.isArray(newcards)) {
        console.error('New card data was not a JSON array:', typeof newcard)
        return
      }

      // Update card array
      cardUsers.splice(0, cardUsers.length, ...newcards)
      console.log('Updated card data (%n total cards)', cardUsers.length)
    })
    .catch((err) => console.error('Failed to update card data', err))
}

function getUsernameFromCardId (cardId, cb) {
  const card = cardUsers.find(card => card.id === cardId)
  if (!card)
    return Promise.reject(new Error('Card not found'))
  else
    return Promise.resolve(card.username)
}

function getAccountBalance (username) {
  return db.one('SELECT SUM(value) FROM transactions WHERE username = $1', username)
    .then(result => result.sum)
}

// This function allows overdrafting
function subtractFunds (username, amount, description) {
  return db.tx(t => {
    // Make sure username exists before recording a purchase
    return t.batch([
      t.one('SELECT uid FROM users WHERE username = $1', username),
      t.one(`INSERT INTO transactions(username, value, descr)
             VALUES ($1, $2, $3)
             RETURNING tid`,
             [username, amount, description])
    ])
    .then(result => result[1].tid)
  })
}

function recordPurchase (username, amount, description) {
  if (amount < 0)
    return Promise.reject(new Error('Amount must be greater than 0'))

  return getAccountBalance(username)
    .then(balance => {
      if (amount < balance)
        return Promise.reject('Insufficient funds')
      
      return Promise.resolve(true)
    })
    .then(() => subtractFunds(username, amount, description))
}

module.exports = {
  getUsernameFromCardId,
  recordPurchase
}
