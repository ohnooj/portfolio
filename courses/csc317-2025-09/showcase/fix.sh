#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-.}"

TEMPLATE='---
title: 
author: 
gallery_item: true
resources:
  - src: piece.png
    params:
      cover: true
---

### Acknowledgements
'

for dir in "$ROOT"/*/; do
  # Get list of non-hidden files
  files=()
  while IFS= read -r -d '' f; do
    files+=("$(basename "$f")")
  done < <(find "$dir" -maxdepth 1 -type f ! -name '.*' -print0)

  # Check: exactly one file and it's index.md
  if [[ ${#files[@]} -eq 1 && "${files[0]}" == "index.md" ]]; then
    echo "✔ Updating $dir/index.md"
    printf "%s" "$TEMPLATE" > "$dir/index.md"
  else
    echo "⏭ Skipping $dir (files: ${files[*]:-none})"
  fi
done

