# Joonho Kim Profile

Static personal profile page generated from Markdown and TOML content files.

## Structure

- `content/about.md` and `content/announcement.md` contain the main prose.
- `content/*.toml` files contain structured rows and site metadata.
- `scripts/build.py` generates the main page from the content files.
- `index.html` is generated output.
- `assets/style.css` contains the site styling.
- `images/` contains only images used by the current page and favicons.
- `courses/csc317-2025-09/` contains linked course demos and showcase pages.
- `sync.sh` sets up Mutagen sync to the public web directory.

## Build

```sh
python3 scripts/build.py
```

## Local Check

```sh
python3 scripts/build.py
tidy -q -e index.html
```
