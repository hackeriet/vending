// Awaitable sleep
async function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Wait for an event
async function event (emitter, eventName) {
  return new Promise((resolve) => {
    emitter.once(eventName, resolve)
  })
}

const Machine = require('./await-machine.js')
const CardReader = require('./await-card-reader.js')
const LCD = require('./await-lcd.js')
const UserManager = require('./await-user.js')

// A complete working vending machine setup
class VendingMachine {
  constructor (opts={}) {
    const { machine, cardReader, lcd, products } = opts
    this.machine = machine || new Machine()
    this.cardReader = cardReader || new CardReader()
    this.lcd = lcd || new LCD()

    // An array of items { name: 'name', price: 42 }
    this.products = products

    this._exiting = false
  }

  async start () {
    while (!this._exiting) {
      try {
        await this.lcd.waitReady()
        this.lcd.write('Ready')

        const cardId = await this.cardReader.read({ timeout: 1000 })
        const user = await User.getUserByCardId(cardId)
        const slotId = await this.machine.waitSelection({ timeout: 7000 })
        const product = this.products[slotId]
        const userHasFunds = user.funds >= product.price

        if (!userHasFunds) {
          throw new Error('Insufficient funds')
        }

        await this.machine.vend(slotId)
        await user.recordSale({ description: product.name, amount: product.price })

        this.lcd.write('Vending complete!')
        await sleep(2000)

      } catch (err) {
        this.lcd.write(err.message)
        await sleep(3000)
      }
    }

    this.lcd.write('Exited')
  }

  stop () {
    this._exiting = true
  }
}

if (!module.parent) {
  const mockLCD = {
    waitReady:  async () => { console.log('LCD Ready'); return Promise.resolve() },
    write:      async (msg) => { console.log('LCD Print', msg); return Promise.resolve() },
    clear:      async () => { console.log('LCD Clear'); return Promise.resolve() },
    close:            () => console.log('LCD Close'),
    setCursor: () => {}
  }

  const machine = new VendingMachine({
    lcd: mockLCD
  })
  machine.start()
  console.log(machine)
}

