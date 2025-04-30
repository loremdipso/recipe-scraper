#!/usr/bin/bash

convert -background none favicon.svg -size 512x512 ./public/favicon-512x512.png
convert -background none favicon.svg -size 192x192 ./public/favicon-192x192.png
convert -background none favicon.svg -size 64x64 ./public/favicon.png
