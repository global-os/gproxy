#!/bin/sh

GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:?GITHUB_CLIENT_ID is required}"

[ -z "${GITHUB_CLIENT_ID}" ] && echo "GITHUB_CLIENT_ID is required" && exit 1

echo "Starting server..."

yarn start

tail -f /dev/null
