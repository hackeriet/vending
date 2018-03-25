// Awaitable sleep
async function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Await an event to be emitted
async function event (emitter, eventName, options={}) {
  return new Promise((resolve, reject) => {
    let timeoutId = -1 // Invalid timeout ID's are alright

    const eventHandler = (...args) => {
      console.log('CARD READ', args)
      clearTimeout(timeoutId)
      resolve(...args)
    }

    // If a timeout has been specified, reject when time is up
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        emitter.removeListener(eventName, eventHandler)
        reject(new Error('Timed out'))
      }, options.timeout)
    }

    // Resolve when the event is emitted
    emitter.once(eventName, eventHandler)
  })
}

const databaseOptions = {
  host: 'matrix.hackeriet.no',
  port: 5432,
  database: 'brus',
  user: 'vending',
  password: process.env.DB_PASSWORD,
  // password: process.env.DB_PASS,
  ssl: true,
  applicationName: 'vending-test'
}

const SLOT_PINS = [21, 22, 23, 24, 25]
const MOTOR_PIN = 29
const BUTTON_PINS = [7, 2, 5, 3, 4]

// Product database
const products = [
  { name: 'Munkholm 0,33', price: 0 },
  { name: 'Club Mate', price: 0 },
  null, // Slot is empty
  { name: 'Tuborg', price: 0 },
  { name: 'Club Mate', price: 0 }
]

// Where to download new card info
const cardURL = 'https://hackeriet.no/hula/member/all_members.json'
const cardAuthUser = 'blade_syncaccounts'
const cardAuthPass = 'ClerfecNabkuCytdildo'

// Dependencies
const Postgres = require('pg-promise')
//const CardReader = require('../await-card-reader.js')
const CardReader = require('../cardreader.js')
const Motor = require('../motor.js')
const LCD = require('../await-lcd.js')
const UserManager = require('../await-user.js')
const superagent = require('superagent')
const Buttons = require('../buttons.js')

let isExiting = false
let _updateInterval = null

// Main function
;(async () => {

  const db = await Postgres()(databaseOptions)
  await db.connect()
  console.log('Connected to database')

  const cardUsers = [] // Passed by reference and updated regularly in main loop
  const users = new UserManager(db, cardUsers)
  const vendFromSlot = Motor(MOTOR_PIN, SLOT_PINS)
  const buttons = Buttons(BUTTON_PINS)
  const cardReader = new CardReader()
  const lcd = new LCD('10.10.3.22', '2121')
  const httpAgent = superagent.agent().auth(cardAuthUser, cardAuthPass)

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

      lcd.print('Ready               Scan card')

      const cardId = await event(cardReader, 'card')
      const username = await users.getUsernameByCardId(cardId)
      await lcd.print(`Select product, ${username}`)

      const slotIndex = await event(buttons, 'pressed', { timeout: 7000 })
      const product = products[slotIndex]
      if (!product) {
        throw new Error(`Slot #${slotIndex} has no dranks`)
      }

      await lcd.print(`Selected a ${product.name}`)

      const availableFunds = await users.getUserAccountBalance(username)

      if (availableFunds < product.price) {
        throw new Error('Insufficient funds')
      }

      console.log('Has enough funds')

      // TODO: Throw exception if vend failed!
      await vendFromSlot(slotIndex)
      console.log('Vending from slot', slotIndex)

      await users.recordUserPurchase(username, product.price, product.name)

      // TODO: Leave a nice random message
      lcd.print('Vending complete!')
      await sleep(2000)

    } catch (err) {

      // Write errors to LCD and let it sit there for a while
      lcd.print(err.message)
      await sleep(3000)

    }
  }

  lcd.print('Exiting...')
  await sleep(2000)

  // TODO: Will not exit until database times out. Disconnect explicitly here.
  console.log('Waiting for database connection to time out...')

})()

//process.on('SIGINT', () => {
//  isExiting = true
//  clearInterval(_updateInterval)
//  console.log('SIGINT received. Exiting...')
//})

