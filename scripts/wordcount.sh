#!/usr/bin/env bash
# Count words of the README "Project overview" (everything before "## Demo video"); limit is 300.
awk '/^## Demo video/{exit} {print}' "${1:-README.md}" \
  | sed -E 's/<!--.*-->//g; s/\[!\[[^]]*\]\([^)]*\)\]\([^)]*\)//g; s/\]\([^)]*\)/]/g; s/[#*_`>\[\]]//g' \
  | wc -w
