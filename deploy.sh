#!/bin/bash

# Build the client
npm run build

# Create server/dist directory if it doesn't exist
mkdir -p server/dist

# Copy the built files to server/dist
cp -r dist/* server/dist/

echo "Deployment files are ready in server/dist"
