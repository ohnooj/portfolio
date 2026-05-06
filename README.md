# Joonho Kim Profile

Static personal profile page generated from structured writing.

## Structure

- `content/site.json` contains the page writing, links, and row data.
- `scripts/build.js` generates the main page from the content file.
- `index.html` is generated output.
- `assets/style.css` contains the site styling.
- `images/` contains only images used by the current page and favicons.
- `courses/csc317-2025-09/` contains linked course demos and showcase pages.
- `sync.sh` sets up Mutagen sync to the public web directory.

## Build

```sh
node scripts/build.js
```

## Local Check

```sh
node scripts/build.js
tidy -q -e index.html
```
