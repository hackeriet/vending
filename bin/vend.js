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
  applicationName: 'vending-test'
}

const SLOT_PINS = [21, 22, 23, 24, 25]
const MOTOR_PIN = 29
const BUTTON_PINS = [7, 2, 5, 3, 4]

// Product database
const products = [
  { name: 'Munkholm 0,33', price: 20 },
  { name: 'Club Mate', price: 35 },
  null, // Slot is empty
  { name: 'Tuborg', price: 35 },
  { name: 'Club Mate', price: 35 }
]

// Where to download new card info
const cardURL = 'https://hackeriet.no/hula/member/all_members.json'
const cardAuthUser = 'blade_syncaccounts'
const cardAuthPass = 'ClerfecNabkuCytdildo'

// Dependencies
const Postgres = require('pg-promise')
const CardReader = require('../cardreader.js')
const Motor = require('../motor.js')
const LCD = require('../lcd.js')
const UserManager = require('../user-manager.js')
const superagent = require('superagent')
const Buttons = require('../buttons.js')

let isExiting = false
let _updateInterval = null

// Main function
;(async () => {

  const db = await Postgres()(databaseOptions)
  await db.connect()
  logger.info('Connected to database')

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
      logger.info('Updated card data (%d total cards)', cardUsers.length)

    } catch (err) {

      logger.error('Failed to update new card data', err)

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
      await lcd.print(`Select product      ${username} <3`)

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

      logger.info('Has enough funds')

      // TODO: Throw exception if vend failed!
      await vendFromSlot(slotIndex)
      logger.info('Vending from slot', slotIndex)

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
  logger.info('Waiting for database connection to time out...')

})()

//process.on('SIGINT', () => {
//  isExiting = true
//  clearInterval(_updateInterval)
//  logger.info('SIGINT received. Exiting...')
//})

