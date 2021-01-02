#!/bin/bash
##### OpenSubtitiles : Optional. If not put, download as a guest. Can limit the overall experience
#OS_USERNAME: Username on www.opensubtitles.org to download english subtitles.
#OS_PASSWORD: Password on opensubtitles
#####
##### Mandatory fields
#TORRENT_NAME: Torrent Name
#DOWNLOAD_PATH: Path where the file is downloaded
#OUTPUT_PATH: Media center target. Needs to follow the Plex structure:
#       /Media
#           /Movies
#            movie content
#        /TV Shows
#              television content
#####
#OS_USERNAME=""
#OS_PASSWORD=""
TORRENT_NAME="$TR_TORRENT_NAME"
DOWNLOAD_PATH="$HOME/Downloads"
OUTPUT_PATH="$HOME/Media"
node "$HOME/Media/scripts/media_torrent/parseTorrentName.js" -n "$TORRENT_NAME" -t "$OUTPUT_PATH" -d "$DOWNLOAD_PATH" -u "$OS_USERNAME" -p "$OS_PASSWORD"