#!/bin/bash
cd /home/kavia/workspace/code-generation/metrics-dashboard-7af3b7de/kavia_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

