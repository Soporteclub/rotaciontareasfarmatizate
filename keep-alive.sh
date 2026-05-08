#!/bin/bash
cd /home/z/my-project
while true; do
    npx next dev -p 3000 --turbopack
    sleep 3
done
