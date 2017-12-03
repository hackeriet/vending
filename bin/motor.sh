#!/bin/bash
# Trigger a slot in the vending machine
# Usage: program motor.sh <motor_pin> <slot_pin>
#
# Author: stigok
# Adapted from hackeriet/pyhackeriet originally written by krav
set -eu
[ ${DEBUG:-0} -eq 1 ] && set -x

# For testing
if [ ${TESTING:-0} -eq 1 ]; then
  function gpio {
    echo "TEST: gpio $@"
  }
fi

# Pins are numbered after the wiringPi scheme (https://pinout.xyz/pinout/wiringpi)
motor=$1
slot=$2

# Keeping the motor up for 5 seconds has proven to be a good value
motor_active_sec=7
slot_wait_sec=2
slot_active_sec=1

# Because of the way the relays are wired, on/off logic is flipped
function deactivate {
  gpio write $1 1
  echo "Pin $1 pulled up ($0)"
}

function activate {
  gpio write $1 0
  echo "Pin $1 pulled down ($0)"
}

function cleanup {
  deactivate $slot
  deactivate $motor
}

# Will always be invoked on script exit
trap cleanup EXIT

# Prepare pins
gpio mode $motor out
gpio mode $slot out

# Think of this as a timeline of actions to perform
secs=0
while [ $secs -le $motor_active_sec ]; do
  [ $secs -eq 0 ]                                    && activate $motor
  [ $secs -eq $slot_wait_sec ]                       && activate $slot
  [ $secs -eq $((slot_wait_sec + slot_active_sec)) ] && deactivate $slot
  [ $secs -eq $motor_active_sec ]                    && deactivate $motor
  
  secs=$((secs + 1))

  # Avoid sleep when done
  [ $secs -ne $motor_active_sec ] && sleep 1
done
