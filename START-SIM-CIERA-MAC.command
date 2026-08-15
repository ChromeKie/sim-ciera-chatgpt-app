#!/bin/bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is needed first."
  echo "Opening the official Node.js download page now."
  open "https://nodejs.org/en/download"
  echo
  read -r -p "Install Node.js, then double-click this file again. Press Return to close."
  exit 1
fi

node scripts/easy-start.mjs
sim_ciera_exit=$?
if [ "$sim_ciera_exit" -ne 0 ]; then
  echo
  read -r -p "Sim-Ciera needs one more setup step. Read the message above, then press Return."
fi
exit "$sim_ciera_exit"
