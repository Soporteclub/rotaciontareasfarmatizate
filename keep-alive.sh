#!/bin/bash
cd /home/z/my-project
while true; do
    echo "[$(date)] Starting Next.js..." >> /home/z/my-project/dev.log
    npx next dev -p 3000 --turbopack >> /home/z/my-project/dev.log 2>&1
    EXIT=$?
    echo "[$(date)] Server exited with code $EXIT, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
done
