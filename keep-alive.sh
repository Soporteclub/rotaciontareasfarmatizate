#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "RESTART $(date)" >> /home/z/my-project/dev.log
  sleep 2
done
