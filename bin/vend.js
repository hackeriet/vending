#!/usr/bin/env node

const { event, sleep } = require('../utils.js')
const logger = require('../logger.js')

const databaseOptions = {
  host: 'matrix.hackeriet.no',
  port: 5432,
  database: 'brus',
  user: 'vending',
  password: process.env.DB_PASSWORD,
  // password: process.env.DB_PASS,
  ssl: true,
  applicationName: 'vending'
}

const SLOT_PINS = [21, 22, 23, 24, 25]
const MOTOR_PIN = 29
const BUTTON_PINS = [7, 2, 0, 3, 4]

// Product database
const products = [
  { name: 'Club Mate', price: 35 },
  { name: 'Club Mate', price: 35 },
  { name: 'Kraftstoff', price: 35 },
  { name: 'Guayaki Yerba Mate Orange', price: 35 },
  { name: 'Tuborg', price: 35 }
]

// Where to download new card info
const cardURL = 'https://hackeriet.no/hula/member/all_members.json'
const cardAuthUser = process.env.CARD_AUTH_USER
const cardAuthPass = process.env.CARD_AUTH_PASS

// Dependencies
const Postgres = require('pg-promise')
const CardReader = require('../cardreader.js')
const Motor = require('../motor.js')
const DatagramLCD = require('../lcd.js')
const UserManager = require('../user-manager.js')
const superagent = require('superagent')
const Buttons = require('../buttons.js')
const pkg = require('../package.json')

let isExiting = false
let _updateInterval = null

// Main function
;(async () => {

  logger.info('%s %s', pkg.name, pkg.version)

  const db = await Postgres()(databaseOptions)
  await db.connect()
  logger.info('Connected to database')

  const cardUsers = [] // Passed by reference and updated regularly in main loop
  const users = new UserManager(db, cardUsers)
  const vendFromSlot = Motor(MOTOR_PIN, SLOT_PINS)
  const buttons = Buttons(BUTTON_PINS)
  const cardReader = new CardReader()
  const lcd = new DatagramLCD({ address: '10.10.3.22', port: '2121' })
  const httpAgent = superagent.agent().auth(cardAuthUser, cardAuthPass)

  // Update card data
  async function updateCardData () {
    try {

      const response = await httpAgent.get(cardURL).accept('json')

      if (!Array.isArray(response.body))
        throw new Error('Downloaded data is not an array')

      const cards = response.body.filter(u => u.card_number)

      // Re-add all array elements
      cardUsers.splice(0, cardUsers.length, ...cards)
      logger.info('Updated card data (%d total cards)', cardUsers.length)

    } catch (err) {

      logger.error('Failed to update new card data:', err)

    }
  }

  await updateCardData()
  _updateInterval = setInterval(() => updateCardData(), 60 * 1000)

  // Run until cancelled
  while (!isExiting) {

    try {

      await lcd.print('Ready               Scan card')

      logger.info('card reader')
      const cardId = await event(cardReader, 'card')
      logger.info('card reader done')
      const username = await users.getUsernameByCardId(cardId)
      const availableFunds = await users.getUserAccountBalance(username)

      await lcd.print(`Select product: ${username} <3 ${availableFunds} coinz`)
      logger.info(`User authenticated: ${username}    funds: ${availableFunds} `)

      const slotIndex = await event(buttons, 'pressed', { timeout: 7000 })
      const product = products[slotIndex]
      if (!product) {
        throw new Error(`Slot #${slotIndex} has no dranks`)
      }

      await lcd.print(`Selected a ${product.name}`)
      logger.info(`Selected ${product.name} from slot #${slotIndex}`)


      if (availableFunds < product.price) {
        throw new Error('Insufficient funds')
      }

      logger.info('User has sufficient funds')

      // TODO: Throw exception if vend failed!
      await vendFromSlot(slotIndex)
      logger.info('Vending from slot', slotIndex)

      await users.recordUserPurchase(username, product.price, product.name)

      // TODO: Leave a nice random message
      await lcd.print(`Vending complete!   ${availableFunds - product.price} coinz left`)
      await sleep(2000)

    } catch (err) {

      // Write errors to LCD and let it sit there for a while
      await lcd.print(err.message)
      logger.info(err.message)
      await sleep(2000)

    }
  }

  await lcd.print('Exiting...')
  logger.info('Waiting for database connection to close...')
  await db.$pool.end()
  logger.info('Database connection closed')

})()

//process.on('SIGINT', () => {
//  isExiting = true
//  clearInterval(_updateInterval)
//  logger.info('SIGINT received. Exiting...')
//})

