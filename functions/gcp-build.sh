#!/bin/bash

# Cloud Functions build environment: install Puppeteer/Chrome for all deployments.
# Puppeteer is required by deckApi for thumbnail generation.
echo "Installing Puppeteer Chrome (GOOGLE_FUNCTION_TARGET=${GOOGLE_FUNCTION_TARGET})..."
node node_modules/puppeteer/install.mjs
