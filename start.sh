#!/bin/bash
#TORRENT_NAME: Torrent Name
#OUTPUT_PATH: Media center target
TORRENT_NAME="Funny Games (2007) [BluRay] [1080p] [YTS.AM]"
#TORRENT_PATH=""
OUTPUT_PATH="$HOME/Media"
npm run build
node parseTorrentName.js -n "$TORRENT_NAME" -t "$OUTPUT_PATH"