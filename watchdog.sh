#!/bin/bash
cd /home/z/my-project
> /home/z/my-project/dev.log
while true; do
  echo "[$(date)] Starting dev server..." >> /home/z/my-project/dev.log
  NODE_OPTIONS='--max-old-space-size=256' npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT" >> /home/z/my-project/dev.log
  sleep 3
done
