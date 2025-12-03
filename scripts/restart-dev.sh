#!/bin/bash
# Recovery script for dev server issues

echo "🔄 Cleaning build artifacts..."
rm -rf .next

echo "🛑 Killing any process on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "⏳ Waiting 2 seconds..."
sleep 2

echo "🚀 Starting fresh dev server..."
npm run dev

