// Awaitable sleep
module.exports.sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Await an event to be emitted
module.exports.event = async (emitter, eventName, options={}) => {
  return new Promise((resolve, reject) => {
    let timeoutId = -1 // Invalid timeout ID's are alright

    // Called when an event is emitted
    const eventHandler = (...args) => {
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

