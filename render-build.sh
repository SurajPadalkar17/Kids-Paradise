#!/bin/bash
set -e  # Exit on error

# Install client dependencies
echo "=== Installing client dependencies ==="
cd client
npm install

# Build the client
echo "=== Building client ==="
npm run build

# Install server dependencies
echo "=== Installing server dependencies ==="
cd ../server
npm install

echo "=== Build completed successfully ==="
