#!/bin/bash
# Bump version, commit, and push — run this instead of git push
V=$(( $(cat assets/version.txt) + 1 ))
echo $V > assets/version.txt
git add -A
git commit -m "${1:-update} (v$V)"
git push
echo "✓ Pushed version $V"
