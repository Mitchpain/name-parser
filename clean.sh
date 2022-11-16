#!/bin/bash

#Edit this variable to add the virtual drive location
DISK_PATH="/srv/dev-disk-by-uuid-6fa965f6-edeb-4150-bae3-a856dc35177c"

COMPLETED_PATH=$DISK_PATH"/Files/Torrents/completed/*"
rm -rf $COMPLETED_PATH
