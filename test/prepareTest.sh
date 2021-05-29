#!/bin/bash

FILE= ./test/testfile.mp4

echo "Checking local test file -> $FILE"
if [ -f $FILE ]; then
  echo "Local test file - OK"
else
  echo "Local test file - MISSING"
  echo "Starting download"
  curl -o $FILE 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  echo "Download completed"
fi