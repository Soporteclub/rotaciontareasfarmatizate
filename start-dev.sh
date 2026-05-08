#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting dev server at $(date)" >> /home/z/my-project/dev.log
  bun next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "Dev server exited with code $EXIT_CODE at $(date)" >> /home/z/my-project/dev.log
  sleep 3
done
