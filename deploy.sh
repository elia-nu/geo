#!/bin/bash
set -e

# Ensure standard binaries (node, npm, pm2, git) are in PATH for non-login SSH sessions
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1

echo "=== [CI/CD Deploy] Starting Production Deployment for Geo HRMS ==="

cd /root/geo

echo "--> Fetching and resetting to latest code from origin/prod..."
git fetch origin prod
git reset --hard origin/prod

echo "--> Installing dependencies (including build devDependencies)..."
npm install --include=dev

echo "--> Building Next.js application..."
npm run build

echo "--> Reloading PM2 process..."
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "=== [CI/CD Deploy] Deployment Complete & Live on https://hrms.efengineering-architect.com! ==="
