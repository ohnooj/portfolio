#!/usr/bin/env python3
from __future__ import annotations

import html
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"


def read_toml(name: str) -> dict:
    return tomllib.loads((CONTENT / name).read_text(encoding="utf-8"))


def read_markdown(name: str) -> str:
    return (CONTENT / name).read_text(encoding="utf-8").strip()


def escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def external_attrs(href: str) -> str:
    return ' target="_blank" rel="noopener noreferrer"' if href.startswith(("http://", "https://")) else ""


def anchor(item: dict, class_name: str = "") -> str:
    class_attr = f' class="{escape(class_name)}"' if class_name else ""
    label = item.get("label", item.get("text", ""))
    return f'<a{class_attr} href="{escape(item["href"])}"{external_attrs(item["href"])}>{escape(label)}</a>'


INLINE_TOKEN = re.compile(r"(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))")


def render_inline(text: str) -> str:
    output = []
    cursor = 0

    for match in INLINE_TOKEN.finditer(text):
        output.append(escape(text[cursor : match.start()]))
        if match.group(2):
            output.append(f"<strong>{escape(match.group(2))}</strong>")
        else:
            output.append(anchor({"label": match.group(3), "href": match.group(4)}))
        cursor = match.end()

    output.append(escape(text[cursor:]))
    return "".join(output)


def render_paragraphs(markdown: str) -> str:
    paragraphs = [block.strip().replace("\n", " ") for block in re.split(r"\n\s*\n", markdown) if block.strip()]
    return "\n".join(f"            <p>{render_inline(paragraph)}</p>" for paragraph in paragraphs)


def render_icon(icon: dict) -> str:
    attrs = " ".join(f'{key}="{escape(value)}"' for key, value in icon.items())
    return f"    <link {attrs} />"


def render_nav(site: dict) -> str:
    links = "\n".join(f"          {anchor(link)}" for link in site["nav"]["links"])
    return f"""      <header class="topbar">
        <a class="wordmark" href="./">{escape(site["nav"]["name"])}</a>
        <nav class="top-links" aria-label="Contact and documents">
          <span>{escape(site["nav"]["email"])}</span>
{links}
        </nav>
      </header>"""


def render_opening(site: dict) -> str:
    portrait = site["portrait"]
    return f"""      <section class="opening" aria-label="About">
        <div>
          <div class="announcement">
            <span>{escape(site["announcement_label"])}</span>
            {render_inline(read_markdown("announcement.md"))}
          </div>

          <div class="about-copy">
{render_paragraphs(read_markdown("about.md"))}
          </div>
        </div>

        <figure class="portrait-plate" data-palette-portrait tabindex="0" aria-label="Show portrait color palette samples">
          <img src="{escape(portrait["src"])}" alt="{escape(portrait["alt"])}" />
          <figcaption>{escape(portrait["caption"])}</figcaption>
        </figure>
      </section>"""


def render_links(links: list[dict] | None) -> str:
    if not links:
        return ""
    return f'            <p class="links">{" ".join(anchor(link) for link in links)}</p>'


def render_media(image: dict | None) -> str:
    if not image:
        return ""

    variant = f' media--{image["variant"]}' if image.get("variant") else ""
    size = f' media--{image["size"]}' if image.get("size") else ""
    class_name = f"media{variant}{size}"
    img = f'<img src="{escape(image["src"])}" alt="{escape(image["alt"])}" />'

    if not image.get("href"):
        return f'            <div class="{class_name}">{img}</div>'

    return f'            <a class="{class_name}" href="{escape(image["href"])}"{external_attrs(image["href"])}>{img}</a>'


def render_item(item: dict) -> str:
    award = f'              <p class="award">{escape(item["award"])}</p>\n' if item.get("award") else ""
    description = f'              <p>{escape(item["description"])}</p>\n' if item.get("description") else ""

    return f"""          <article class="item">
            <p class="date">{escape(item["date"])}</p>
            <div class="item-body">
              <h3>{escape(item["title"])}</h3>
              <p class="meta">{render_inline(item["meta"])}</p>
{award}{description}{render_links(item.get("links"))}
            </div>
{render_media(item.get("image"))}
          </article>"""


def render_section(section: dict) -> str:
    heading_id = f'{section["id"]}-heading'
    rows = read_toml(section["file"])["items"]
    items = "\n\n".join(render_item(item) for item in rows)

    return f"""      <section class="section" aria-labelledby="{escape(heading_id)}">
        <h2 class="section-label" id="{escape(heading_id)}">{escape(section["title"])}</h2>
        <div class="item-list">
{items}
        </div>
      </section>"""


def build() -> None:
    site = read_toml("site.toml")
    page = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="author" content="{escape(site["author"])}" />
    <meta name="theme-color" content="{escape(site["theme_color"])}" />
{chr(10).join(render_icon(icon) for icon in site["icons"])}
    <link rel="stylesheet" href="{escape(site["font_url"])}" />
    <link rel="stylesheet" href="assets/style.css" />

    <title>{escape(site["title"])}</title>
  </head>

  <body>
    <main class="site-shell">
{render_nav(site)}

{render_opening(site)}

{chr(10).join(render_section(section) for section in site["sections"])}
    </main>
    <script src="assets/palette-samples.js" defer></script>
  </body>
</html>
"""
    (ROOT / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
