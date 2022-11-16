#!/bin/bash
#Don't forget to sudo chmod 777 this file
#Edit this variable to add the virtual drive location
DISK_PATH="/srv/dev-disk-by-uuid-6fa965f6-edeb-4150-bae3-a856dc35177c"

COMPLETED_PATH=$DISK_PATH"/Files/Torrents/completed"
FILES=$COMPLETED_PATH"/*"
for f in $FILES
do
  echo "Processing ${f##*/} file..."
  # take action on each file. $f store current file name
  node parseTorrentName.js -n "${f##*/}" -t $DISK_PATH -d $COMPLETED_PATH -u "" -p ""

  
done
