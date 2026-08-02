#!/usr/bin/env python3
"""外部の公開API/フィードから断片を集めて fragments.json を書く。

    python3 scripts/collect.py

方針:
  * 標準ライブラリだけで動かす（CIで pip install を挟まないため）
  * ソースは公式API/フィードに限る。スクレイピングはしない
  * 本文は丸ごと転載せず、タイトルと要約の冒頭までに留める
  * 1ソース落ちても全体は落とさない。ただし収穫が少なすぎるときは
    書き込まず異常終了する（前回の fragments.json を残すため）

出力は [{tag,title,body,src,url}] の配列か、
{"generated_at":..., "items":[...]} のどちらか。フロントは両方受ける。
"""

import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

UA = "pepstech-lab/1.0 (+https://lab.pepstech.pw) python-urllib"
TIMEOUT = 15
PAUSE = 0.7          # 相手先を叩きすぎない
MIN_ITEMS = 4        # これを下回ったら書き換えない
BODY_MAX = 92

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fragments.json")

JST = timezone(timedelta(hours=9))

# 追加したいフィードはここに。robots.txt と利用規約を確認してから足すこと。
RSS_FEEDS = [
    # ("タグ", "https://example.com/feed.xml"),
]

# WMO weather code → 日本語。Open-Meteo が返すコード。
WMO = {
    0: "快晴", 1: "晴れ", 2: "薄曇り", 3: "曇り",
    45: "霧", 48: "霧氷",
    51: "霧雨", 53: "霧雨", 55: "強い霧雨",
    56: "着氷性の霧雨", 57: "着氷性の霧雨",
    61: "小雨", 63: "雨", 65: "強い雨",
    66: "着氷性の雨", 67: "着氷性の雨",
    71: "小雪", 73: "雪", 75: "大雪", 77: "霧雪",
    80: "にわか雨", 81: "にわか雨", 82: "激しいにわか雨",
    85: "にわか雪", 86: "強いにわか雪",
    95: "雷雨", 96: "雹をともなう雷雨", 99: "雹をともなう雷雨",
}


def get(url, as_json=True):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/json, application/xml;q=0.9, */*;q=0.5",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
    time.sleep(PAUSE)
    return json.loads(raw) if as_json else raw


def clip(text, limit=BODY_MAX):
    text = re.sub(r"\s+", " ", (text or "")).strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def strip_tags(html):
    return re.sub(r"<[^>]+>", "", html or "")


# ---------------------------------------------------------------- sources

def from_hackernews(n=3):
    """Hacker News 公式API。タイトルとスコアだけ拾う。"""
    ids = get("https://hacker-news.firebaseio.com/v0/topstories.json")[:30]
    out = []
    for sid in random.sample(ids, min(n, len(ids))):
        item = get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
        if not item or not item.get("title"):
            continue
        out.append({
            "tag": "HN",
            "title": clip(item["title"], 70),
            "body": clip(f"{item.get('score', 0)}ポイント / コメント{item.get('descendants', 0)}件。"),
            "src": "news.ycombinator.com",
            "url": f"https://news.ycombinator.com/item?id={sid}",
        })
    return out


def from_wikipedia(n=2):
    """日本語版のおまかせ表示。要約の冒頭だけ。"""
    out = []
    for _ in range(n):
        d = get("https://ja.wikipedia.org/api/rest_v1/page/random/summary")
        extract = d.get("extract") or ""
        if not extract:
            continue
        out.append({
            "tag": "WIKI",
            "title": clip(d.get("title", ""), 60),
            "body": clip(extract),
            "src": "ja.wikipedia.org",
            "url": (d.get("content_urls", {}).get("desktop", {}).get("page") or ""),
        })
    return out


def from_weather():
    """Open-Meteo（APIキー不要）。東京の今日。"""
    q = urllib.parse.urlencode({
        "latitude": 35.6895, "longitude": 139.6917,
        "current": "temperature_2m,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "Asia/Tokyo", "forecast_days": 1,
    })
    d = get("https://api.open-meteo.com/v1/forecast?" + q)
    cur, daily = d.get("current", {}), d.get("daily", {})
    code = (daily.get("weather_code") or [None])[0]
    hi = (daily.get("temperature_2m_max") or [None])[0]
    lo = (daily.get("temperature_2m_min") or [None])[0]
    desc = WMO.get(code, "よくわからない天気")
    now = cur.get("temperature_2m")
    body = f"{desc}。最高{hi}℃ / 最低{lo}℃。"
    if now is not None:
        body += f"いまは{now}℃。"
    return [{
        "tag": "天気",
        "title": "東京 きょう",
        "body": clip(body),
        "src": "open-meteo.com",
        "url": "https://open-meteo.com/",
    }]


def from_rss(tag, url, n=2):
    """RSS 2.0 / Atom の両方をゆるく読む。タイトルと要約の冒頭のみ。"""
    root = ET.fromstring(get(url, as_json=False))
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//item") or root.findall(".//atom:entry", ns)
    out = []
    for e in entries[:n]:
        t = e.findtext("title") or e.findtext("atom:title", default="", namespaces=ns)
        link = e.findtext("link") or ""
        if not link:
            le = e.find("atom:link", ns)
            link = le.get("href", "") if le is not None else ""
        summary = (e.findtext("description")
                   or e.findtext("atom:summary", default="", namespaces=ns)
                   or "")
        if not t:
            continue
        out.append({
            "tag": tag,
            "title": clip(t, 70),
            "body": clip(strip_tags(summary)) or "（要約なし）",
            "src": urllib.parse.urlparse(url).netloc,
            "url": link,
        })
    return out


# ---------------------------------------------------------------- main

def run(label, fn, *args):
    try:
        got = fn(*args)
        print(f"[ok]   {label}: {len(got)}件", file=sys.stderr)
        return got
    except (urllib.error.URLError, urllib.error.HTTPError, ET.ParseError,
            json.JSONDecodeError, KeyError, TimeoutError, OSError) as e:
        print(f"[skip] {label}: {type(e).__name__}: {e}", file=sys.stderr)
        return []


def main():
    items = []
    items += run("hackernews", from_hackernews)
    items += run("wikipedia", from_wikipedia)
    items += run("weather", from_weather)
    for tag, url in RSS_FEEDS:
        items += run(f"rss:{tag}", from_rss, tag, url)

    if len(items) < MIN_ITEMS:
        print(f"\n収穫が {len(items)} 件で下限 {MIN_ITEMS} 未満。"
              f"{os.path.basename(OUT)} は書き換えない。", file=sys.stderr)
        sys.exit(1)

    random.shuffle(items)
    payload = {
        "generated_at": datetime.now(JST).isoformat(timespec="seconds"),
        "items": items,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print(f"\n{len(items)}件を {OUT} に書いた。", file=sys.stderr)


if __name__ == "__main__":
    main()
