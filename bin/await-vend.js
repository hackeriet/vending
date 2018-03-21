// Awaitable sleep
async function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Await an event to be emitted
async function event (emitter, eventName) {
  return new Promise((resolve) => {
    emitter.once(eventName, resolve)
  })
}

const databaseOptions = {
  host: '127.0.0.1',
  port: 5432,
  database: 'vending',
  user: 'postgres',
  // password: process.env.DB_PASS,
  ssl: false,
  applicationName: 'vending-test'
}

// Product database
const products = [
  { name: 'Munkholm 0,33', price: 35 },
  { name: 'Club Mate', price: 35 },
  { name: 'Tuborg', price: 35 },
  null, // Slot is empty
  { name: 'Club Mate', price: 35 }
]

// Where to download new card info
const cardURL = 'https://hackeriet.no/hula/member/all_members.json'
const cardAuthUser = 'blade_syncaccounts'
const cardAuthPass = 'ClerfecNabkuCytdildo'

// Dependencies
const Postgres = require('pg-promise')
const Machine = require('../await-machine.js')
const CardReader = require('../await-card-reader.js')
const LCD = require('../await-lcd.js')
const UserManager = require('../await-user.js')
const superagent = require('superagent')

let isExiting = false
let _updateInterval = null

// Main function
;(async () => {

  const db = await Postgres()(databaseOptions)
  const cardUsers = [] // Passed by reference and updated regularly in main loop
  const users = new UserManager(db, cardUsers)
  const machine = new Machine()
  const cardReader = new CardReader()
  const lcd = new LCD()
  const httpAgent = superagent.agent().auth(cardAuthUser, cardAuthPass)

  // Initial machine setup
  await lcd.waitReady()

  // Update card data
  async function updateCardData () {
    try {

      const { body: newCards } = await httpAgent
        .get(cardURL)
        .accept('json')

      if (!Array.isArray(newCards))
        throw new Error('Downloaded data is not an array')

      cardUsers.splice(0, cardUsers.length, ...newCards)
      console.log('Updated card data (%d total cards)', cardUsers.length)

    } catch (err) {

      console.error('Failed to update new card data', err)

    }
  }

  await updateCardData()
  _updateInterval = setInterval(() => updateCardData(), 60 * 1000)

  // Run until cancelled
  while (!isExiting) {

    try {

      lcd.write('Ready')

      const cardId = await cardReader.read({ timeout: 1000 })
      const username = await users.getUsernameByCardId(cardId)
      const slotId = await machine.waitSelection({ timeout: 7000 })
      const product = products[slotId]

      if (!product) {
        throw new Error(`Slot #${slotId} has no dranks`)
      }

      const availableFunds = await users.getUserAccountBalance(username)

      if (availableFunds < product.price) {
        throw new Error('Insufficient funds')
      }

      // TODO: Throw exception if vend failed!
      await machine.vend(slotId)
      await users.recordUserPurchase(username, product.price, product.name)

      // TODO: Leave a nice random message
      lcd.write('Vending complete!')
      await sleep(2000)

    } catch (err) {

      // Write errors to LCD and let it sit there for a while
      lcd.write(err.message)
      await sleep(3000)

    }
  }

  lcd.write('Exiting...')
  await sleep(2000)

  // TODO: Will not exit until database times out. Disconnect explicitly here.
  console.log('Waiting for database connection to time out...')

})()

process.on('SIGINT', () => {
  isExiting = true
  clearInterval(_updateInterval)
  console.log('SIGINT received. Exiting...')
})

