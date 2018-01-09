/*
Looping NFC/RFID daemon.

Mostly based on example snippets from libnfc.

Author: Lasse Karstensen <lasse.karstensen@gmail.com>, October 2017

Background information:
* https://learn.adafruit.com/adafruit-pn532-rfid-nfc/mifare

# apt-get install libnfc-dev

*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <signal.h>

#include "nfc/nfc.h"
#include "nfc/nfc-types.h"

#include "foreign/nfc-utils.h"

static volatile bool keep_running = true;
int DEBUG = 1;

#define debug_print(fmt, ...) \
      do { if (DEBUG) fprintf(stderr, fmt, __VA_ARGS__); } while (0)

void shutdown(int foo) {
  debug_print("%s\n", "Caught SIGINT, shutting down ..");
  keep_running = false;
}

int main(int argc, const char *argv[]) {
  nfc_device *pnd;
  nfc_target nt;
  nfc_context *context;

  int res;

  signal(SIGINT, shutdown);

  nfc_init(&context);
  if (context == NULL) {
    printf("Unable to init libnfc (malloc)\n");
    exit(EXIT_FAILURE);
  }
  (void)argc;

  pnd = nfc_open(context, NULL);

  if (pnd == NULL) {
    printf("ERROR: %s\n", "Unable to open any NFC devices.");
    exit(EXIT_FAILURE);
  }

  if (nfc_initiator_init(pnd) < 0) {
    nfc_perror(pnd, "nfc_initiator_init");
    exit(EXIT_FAILURE);
  }
  printf("# NFC reader %s opened\n", nfc_device_get_name(pnd));

  // http://www.libnfc.org/api/group__initiator.html#gaed2949299759f9a889f6c93f5c365296
  const uint8_t pollnr = 3;
  const uint8_t period = 1;

  const nfc_modulation nmMifare[1] = {
    { .nmt = NMT_ISO14443A, .nbr = NBR_106 },
  };
  const size_t szModulations = 1;

  while (keep_running) {
    debug_print("%s\n", "# polling ...");

    res = nfc_initiator_poll_target(pnd, nmMifare, szModulations, pollnr,
                                    period, &nt);

    if (res == NFC_ETIMEOUT || res == NFC_ECHIP) {
      debug_print("%s\n", "# no card found.");
      continue;
    }
    else if (res < 0) {
      // printf("%s %i\n", nfc_strerror(pnd), res);
      nfc_perror(pnd, "nfc_initiator_poll_target");
      nfc_close(pnd);
      nfc_exit(context);
      exit(EXIT_FAILURE);
    }

    if (res > 0) {
      printf("CARDSEEN: 0x");
      for (int len = 0; len < nt.nti.nai.szUidLen; len++) {
        printf("%02x", nt.nti.nai.abtUid[len]);
      }
      printf("\n");
      debug_print("%s\n", "# Waiting for card to be removed ...");
      fflush(stdout);

      while (0 == nfc_initiator_target_is_present(pnd, NULL)) {}
      // nfc_perror(pnd, "nfc_initiator_target_is_present");
      debug_print("%s\n", "# card has been removed.");
    }
  } // while (keep_running)
  nfc_close(pnd);
  nfc_exit(context);

  return(EXIT_SUCCESS);
}
