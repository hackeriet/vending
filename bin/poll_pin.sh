#!/bin/bash
# Print a message when state changes

set -eu

pin=$1

gpio mode $pin up

last_state=0

while true; do
  pin_state=$(gpio read $pin)

  # Only write to pin when needed
  if [ x$pin_state != x$last_state ]; then
    echo "Pin $pin state is $pin_state"
    last_state=$pin_state
  fi

  sleep 0.1
done
