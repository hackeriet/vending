## Install and run

Tested on a raspbian system with the following extra stuff
- Node.js version 7.10.1
- `apt install build-essential libsystemd-dev`

1. Copy the source code to `/opt/vending`
2. Build the `nfcreader` daemon with `cd nfcreader && make`
3. Copy the systemd service file(s) to `/etc/systemd/system`
4. Set environment variables in the newly copied service file
5. Reload systemd daemon `systemctl daemon-reload`
6. Start service `systemctl start vending`
7. See log output `journalctl -fu vending`

## Notes
### Watchdog
The systemd service is of `Type=notify`, which means that it expects calls
to `sd_notify` within the specified timeout of `WatchdogSec`.

The *bin/vend.js* script spawns an instance of *nfcreader* which takes care
of these calls to keep the watchdog happy. This decision was made after
suspicions that the *nfcreader* script is deadlocking and needs an occasional
restart due to possible hardware issues.

Hence, whenever the card reader daemon dies, the program is restarted thanks
to `Restart=always`.

A thing to be aware of is that the `nfcreader` will block until a tag that has
been read is removed from the reader again. If the tag is not removed within
the watchdog time limit, the process will restart due to missed ping events.
