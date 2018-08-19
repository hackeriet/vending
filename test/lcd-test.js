const { assert } = require('chai')
const sinon = require('sinon')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const dgram = require('dgram')

const LCD = require('../lcd2.js')

describe('LCD', function () {
  it('exports a function', function () {
    assert.isFunction(LCD);
  })

  it('has a member _socket', function () {
    const lcd = new LCD()
    assert.property(lcd, '_socket')
  })

  it('socket is a UDP socket', function () {
    const lcd = new LCD()
    assert.instanceOf(lcd._socket, dgram.Socket)
  })

  it('implements member function print()', function () {
    const lcd = new LCD()
    assert.isFunction(lcd.print)
  })

  it('does not expose print() as non-member function', function () {
    assert.notProperty(LCD, 'print')
  })

  describe('print()', function () {
    let fakeSend
    let fakeSocket
    let lcd

    beforeEach(function () {
      fakeSend = sinon.stub()
      fakeSocket = {
        send: fakeSend
      }
      lcd = new LCD({ _socket: fakeSocket })
    })

    it('returns a promise', function () {
      const prom = lcd.print()
      assert.instanceOf(prom, Promise)
    })

    it('calls on socket.send()', function () {
      lcd.print()
      assert(fakeSend.called)
    })

    it('rejects on errors', async function () {
      fakeSend.callsArgWith(3, 'my error msg')
      const prom = lcd.print('msg')
      await assert.isRejected(prom, 'my error msg')
    })

    it('resolves on success', async function () {
      fakeSend.callsArg(3)
      const prom = lcd.print('msg')
      await assert.isFulfilled(prom)
    })

    it('passes buffer and connection info to socket.send()', function () {
      const opts = {
        _socket: fakeSocket,
        address: '1.2.3.4',
        port: 77
      }
      const lcd = new LCD(opts)
      const msg = Buffer.from('Hello world')
      lcd.print(msg)
      assert(fakeSend.calledWith(msg, opts.port, opts.address))
    })
  })
})

