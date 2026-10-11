#!/bin/bash
set -e

echo "=== [CI/CD Deploy] Starting Production Deployment for Geo HRMS ==="

cd /root/geo

echo "--> Pulling latest code..."
git pull origin prod || git pull origin main || git pull origin master

echo "--> Installing dependencies..."
npm install

echo "--> Building Next.js application..."
npm run build

echo "--> Reloading PM2 process..."
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "=== [CI/CD Deploy] Deployment Complete & Live on https://hrms.efengineering-architect.com! ==="
