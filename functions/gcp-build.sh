#!/bin/bash

# Cloud Functions build environment sets GOOGLE_FUNCTION_TARGET for the function being deployed.
# When deploying 'deckApi', we need Puppeteer/Chrome installed.
if [ "$GOOGLE_FUNCTION_TARGET" = "deckApi" ]; then
  echo "Installing Puppeteer for deckApi..."
  node node_modules/puppeteer/install.mjs
else
  echo "Skipping Puppeteer installation for $GOOGLE_FUNCTION_TARGET"
fi
