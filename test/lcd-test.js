const { assert } = require('chai')
const sinon = require('sinon')

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

  describe('print()', function () {

    it('calls on socket.send()', function () {
      const _socket = {
        send: sinon.fake()
      }
      const lcd = new LCD({ _socket })
      lcd.print()
      assert(_socket.send.called)
    })

    it('passes buffer and connection info to socket.send()', function () {
      const send = sinon.spy()
      const msg = new Buffer('Hello world')
      const opts = {
        _socket: { send },
        address: '1.2.3.4',
        port: 77
      }
      const lcd = new LCD(opts)
      lcd.print(msg)
      assert(send.calledWith(msg, opts.port, opts.address))
    })
  })
})

