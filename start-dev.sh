#!/bin/bash
while true; do
  cd /home/z/my-project
  echo "[$(date)] Starting dev server..." >> /home/z/my-project/dev.log
  npx next dev -p 3000 --turbopack >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> /home/z/my-project/dev.log
  sleep 2
done
