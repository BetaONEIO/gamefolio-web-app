#!/bin/bash
set -e
npm install
echo "" | npm run db:push
