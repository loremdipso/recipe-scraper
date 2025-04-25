#!/usr/bin/bash

npm run build
cp ./favicon.png ./docs
cp ./favicon-192x192.png ./docs
cp ./favicon-512x512.png ./docs
cp ./manifest.json ./docs
