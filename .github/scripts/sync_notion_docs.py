#!/usr/bin/env python3
"""Export approved Madheshi App V1 Notion pages into generated Markdown."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://api.notion.com/v1"
VERSION = "2022-06-28"
OUT = Path("docs/notion")
SOURCES = [
    ("V1_RELEASE_SCOPE.md", "4119628c857d811ab1fbff2b9062d66f"),
    ("V1_FUNCTIONAL_REQUIREMENTS.md", "4119628c857d814fb3ebd9946cab3701"),
    ("V1_DEVELOPMENT_PLAN.md", "4119628c857d81458e31cdcfd484d031"),
]

LIST_ITEM_TYPES = ("bulleted_list_item", "numbered_list_item", "to_do")
KNOWN_NON_RENDERED_TYPES = {
    "breadcrumb",
    "column",
    "column_list",
    "link_preview",
    "synced_block",
    "table_of_contents",
    "template",
    "unsupported",
}
SUPPORTED_TYPES = {
    "paragraph", "heading_1", "heading_2", "heading_3",
    "bulleted_list_item", "numbered_list_item", "to_do",
    "quote", "callout", "toggle", "code", "divider", "bookmark",
    "image", "file", "pdf", "video", "audio", "equation",
    "child_page", "child_database", "table",
} | KNOWN_NON_RENDERED_TYPES


def get(path):
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise RuntimeError("NOTION_TOKEN is missing")
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + token,
        "Notion-Version": VERSION,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(
            f"Notion API HTTP {exc.code} at {path}: {detail}"
        ) from exc


def rt(items):
    parts = []
    for item in items or []:
        value = item.get("plain_text", "")
        annotations = item.get("annotations", {}) or {}
        if annotations.get("code"):
            value = "`" + value + "`"
        if annotations.get("bold"):
            value = "**" + value + "**"
        if annotations.get("italic"):
            value = "*" + value + "*"
        if annotations.get("strikethrough"):
            value = "~~" + value + "~~"
        if annotations.get("underline"):
            value = "<u>" + value + "</u>"
        if item.get("href"):
            value = "[" + value + "](" + item["href"] + ")"
        parts.append(value)
    return "".join(parts)


def children(block_id):
    result = []
    cursor = None
    while True:
        query = "?page_size=100" + (
            "&start_cursor=" + cursor if cursor else ""
        )
        payload = get("/blocks/" + block_id + "/children" + query)
        result.extend(payload.get("results", []))
        if not payload.get("has_more"):
            return result
        cursor = payload.get("next_cursor")
        if not cursor:
            raise RuntimeError("Missing pagination cursor")


def title_of(page):
    for prop in page.get("properties", {}).values():
        if prop.get("type") == "title":
            return rt(prop.get("title", [])) or "Untitled"
    return "Untitled"


def table_md(block):
    rows = children(block["id"])
    data = [
        [rt(cell) for cell in row.get("table_row", {}).get("cells", [])]
        for row in rows
    ]
    if not data:
        return ""
    column_count = max(map(len, data))
    data = [row + [""] * (column_count - len(row)) for row in data]

    def format_row(row):
        cells = [
            cell.replace("|", "\\|").replace("\\n", " ")
            for cell in row
        ]
        return "| " + " | ".join(cells) + " |"

    return "\\n".join(
        [format_row(data[0]), format_row(["---"] * column_count)]
        + [format_row(row) for row in data[1:]]
    )


def render(blocks, depth=0):
    output = []
    numbered_index = 0

    for block in blocks:
        block_type = block.get("type")
        data = block.get(block_type, {}) or {}
        text = ""

        if block_type in (
            "paragraph", "heading_1", "heading_2", "heading_3",
            "bulleted_list_item", "numbered_list_item", "quote",
            "callout", "toggle",
        ):
            text = rt(data.get("rich_text", []))
        elif block_type == "to_do":
            marker = "[x]" if data.get("checked") else "[ ]"
            text = marker + " " + rt(data.get("rich_text", []))
        elif block_type == "code":
            fence = chr(96) * 3
            text = (
                fence + data.get("language", "") + "\\n"
                + rt(data.get("rich_text", [])) + "\\n" + fence
            )
        elif block_type == "divider":
            text = "---"
        elif block_type == "bookmark":
            url = data.get("url", "")
            caption = rt(data.get("caption", [])) or url
            text = "[" + caption + "](" + url + ")" if url else caption
        elif block_type in ("image", "file", "pdf", "video", "audio"):
            file_data = data.get("file") or data.get("external") or {}
            url = file_data.get("url", "")
            caption = rt(data.get("caption", [])) or block_type.title()
            text = "[" + caption + "](" + url + ")" if url else caption
        elif block_type == "equation":
            text = "$$" + data.get("expression", "") + "$$"
        elif block_type == "child_page":
            text = "### " + data.get("title", "Child page")
        elif block_type == "child_database":
            text = "**Database:** " + data.get("title", "Database")
        elif block_type == "table":
            text = table_md(block)
        elif block_type not in KNOWN_NON_RENDERED_TYPES:
            print(
                f"Warning: unsupported Notion block type '{block_type}' "
                f"(block id: {block.get('id', 'unknown')}); content was not rendered.",
                file=sys.stderr,
            )

        if block_type == "heading_1":
            text = "# " + text
        elif block_type == "heading_2":
            text = "## " + text
        elif block_type == "heading_3":
            text = "### " + text
        elif block_type == "bulleted_list_item":
            text = "- " + text
        elif block_type == "numbered_list_item":
            numbered_index += 1
            text = str(numbered_index) + ". " + text
        elif block_type == "to_do":
            text = "- " + text
        elif block_type == "quote":
            text = "> " + text
        elif block_type == "callout":
            emoji = (data.get("icon") or {}).get("emoji", "")
            text = "> " + emoji + " " + text

        if block_type != "numbered_list_item":
            numbered_index = 0

        if depth and block_type in LIST_ITEM_TYPES:
            text = "  " * depth + text

        if text:
            output.append(text)

        if block.get("has_children") and block_type != "table":
            nested_depth = depth + (
                1 if block_type in LIST_ITEM_TYPES or block_type == "toggle"
                else 0
            )
            nested = render(children(block["id"]), nested_depth)
            if nested:
                output.append(nested)

    return "\\n\\n".join(output)


def export(filename, page_id):
    page = get("/pages/" + page_id)
    title = title_of(page)
    url = page.get("url") or (
        "https://www.notion.so/" + page_id.replace("-", "")
    )
    edited = page.get("last_edited_time", "unknown")
    body = render(children(page_id))
    synced = datetime.now(timezone.utc).isoformat(timespec="seconds")
    header = (
        "<!-- GENERATED FILE — DO NOT EDIT MANUALLY. Edit Notion and sync. -->\\n"
        + "<!-- Source page ID: " + page_id + " -->\\n"
        + "<!-- Notion last edited: " + edited + " -->\\n"
        + "<!-- Synced at: " + synced + " -->\\n\\n# " + title + "\\n\\n"
        + "**Source:** [" + title + "](" + url + ")  \\n"
        + "**Notion last edited:** " + edited + "  \\n"
        + "**Snapshot synced:** " + synced + "\\n\\n---\\n\\n"
    )
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / filename).write_text(
        header + body.rstrip() + "\\n", encoding="utf-8"
    )
    print("Exported " + title + " to " + str(OUT / filename))


def main():
    for filename, page_id in SOURCES:
        export(filename, page_id)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("Sync failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
