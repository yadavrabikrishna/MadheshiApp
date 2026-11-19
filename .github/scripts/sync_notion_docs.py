#!/usr/bin/env python3
"""Export approved Madheshi App V1 Notion pages into generated Markdown."""
from __future__ import annotations
import os, sys, json, urllib.request, urllib.error
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

def get(path):
    token = os.environ.get("NOTION_TOKEN")
    if not token: raise RuntimeError("NOTION_TOKEN is missing")
    req = urllib.request.Request(API + path, headers={
        "Authorization": "Bearer " + token, "Notion-Version": VERSION,
        "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"Notion API HTTP {e.code} at {path}: {detail}") from e

def rt(items):
    parts=[]
    for x in items or []:
        s=x.get("plain_text",""); a=x.get("annotations",{}) or {}
        if a.get("code"): s="`"+s+"`"
        if a.get("bold"): s="**"+s+"**"
        if a.get("italic"): s="*"+s+"*"
        if a.get("strikethrough"): s="~~"+s+"~~"
        if a.get("underline"): s="<u>"+s+"</u>"
        if x.get("href"): s="["+s+"]("+x["href"]+")"
        parts.append(s)
    return "".join(parts)

def children(block_id):
    result=[]; cursor=None
    while True:
        q="?page_size=100"+("&start_cursor="+cursor if cursor else "")
        payload=get("/blocks/"+block_id+"/children"+q)
        result.extend(payload.get("results",[]))
        if not payload.get("has_more"): return result
        cursor=payload.get("next_cursor")
        if not cursor: raise RuntimeError("Missing pagination cursor")

def title_of(page):
    for p in page.get("properties",{}).values():
        if p.get("type")=="title": return rt(p.get("title",[])) or "Untitled"
    return "Untitled"

def table_md(block):
    rows=children(block["id"])
    data=[[rt(c) for c in row.get("table_row",{}).get("cells",[])] for row in rows]
    if not data: return ""
    n=max(map(len,data)); data=[r+[""]*(n-len(r)) for r in data]
    def fmt(row): return "| "+" | ".join(c.replace("|","\\|").replace("\n"," ") for c in row)+" |"
    return "\n".join([fmt(data[0]),fmt(["---"]*n)]+[fmt(r) for r in data[1:]])

def render(blocks,depth=0):
    out=[]
    for b in blocks:
        typ=b.get("type"); d=b.get(typ,{}) or {}; text=""
        if typ in ("paragraph","heading_1","heading_2","heading_3","bulleted_list_item","numbered_list_item","quote","callout","toggle"):
            text=rt(d.get("rich_text",[]))
        elif typ=="code":
            fence=chr(96)*3
            text=fence+d.get("language","")+"\n"+rt(d.get("rich_text",[]))+"\n"+fence
        elif typ=="divider": text="---"
        elif typ=="bookmark":
            u=d.get("url",""); caption=rt(d.get("caption",[])) or u
            text="["+caption+"]("+u+")" if u else caption
        elif typ in ("image","file","pdf","video","audio"):
            f=d.get("file") or d.get("external") or {}; u=f.get("url","")
            caption=rt(d.get("caption",[])) or typ.title()
            text="["+caption+"]("+u+")" if u else caption
        elif typ=="equation": text="$$"+d.get("expression","")+"$$"
        elif typ=="child_page": text="### "+d.get("title","Child page")
        elif typ=="child_database": text="**Database:** "+d.get("title","Database")
        elif typ=="table": text=table_md(b)
        if typ=="heading_1": text="# "+text
        elif typ=="heading_2": text="## "+text
        elif typ=="heading_3": text="### "+text
        elif typ=="bulleted_list_item": text="- "+text
        elif typ=="numbered_list_item": text="1. "+text
        elif typ=="quote": text="> "+text
        elif typ=="callout": text="> "+((d.get("icon") or {}).get("emoji",""))+" "+text
        if depth and typ in ("bulleted_list_item","numbered_list_item"): text="  "*depth+text
        if text: out.append(text)
        if b.get("has_children") and typ!="table":
            nested=render(children(b["id"]),depth+(1 if typ in ("bulleted_list_item","numbered_list_item","toggle") else 0))
            if nested: out.append(nested)
    return "\n\n".join(out)

def export(filename,page_id):
    page=get("/pages/"+page_id); title=title_of(page)
    url=page.get("url") or "https://www.notion.so/"+page_id.replace("-","")
    edited=page.get("last_edited_time","unknown"); body=render(children(page_id))
    synced=datetime.now(timezone.utc).isoformat(timespec="seconds")
    header=("<!-- GENERATED FILE — DO NOT EDIT MANUALLY. Edit Notion and sync. -->\n"
      +"<!-- Source page ID: "+page_id+" -->\n<!-- Notion last edited: "+edited+" -->\n"
      +"<!-- Synced at: "+synced+" -->\n\n# "+title+"\n\n"
      +"**Source:** ["+title+"]("+url+")  \n**Notion last edited:** "+edited+"  \n"
      +"**Snapshot synced:** "+synced+"\n\n---\n\n")
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/filename).write_text(header+body.rstrip()+"\n",encoding="utf-8")
    print("Exported "+title+" to "+str(OUT/filename))

def main():
    for file,page in SOURCES: export(file,page)
    return 0
if __name__=="__main__":
    try: sys.exit(main())
    except Exception as exc:
        print("Sync failed: "+str(exc),file=sys.stderr); sys.exit(1)
