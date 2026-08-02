# lab.pepstech.pw

`me.pepstech.pw` の対極として作った実験サイト。
集めてきた断片を、毎回ちがう「版」で刷り直して見せる。

固定のデザインを持たないのが仕様で、開くたびに次が変わる。

- **配色** — 紙1色 + インク2色の組み合わせ（7種）から抽選
- **組版** — カードごとにフォントを別々に抽選。統一しない
- **配置** — グリッドを使わない散乱配置。重なり・はみ出しを許容する
- **画像** — 網点（ハーフトーン）をブラウザ側で毎回生成。2版をわずかにズラして刷る
- **ミーム** — 収集した断片のタイトル、または語彙プールから生成

## 構成

```
index.html                     ページ本体
app.css                        スタイル
app.js                         生成・配置ロジック（画像もミームもここ）
vendor/model-viewer.min.js     3D表示（自己完結ビルド。CDNは参照しない）
assets/mascot-rabbit.glb       マスコット
fragments.json                 収集結果。cron が書き換える
scripts/collect.py             収集スクリプト
.github/workflows/collect.yml  1時間おきに collect.py を回す
CNAME                          lab.pepstech.pw
```

**この4ファイル（index.html / app.css / app.js）が編集元。**
初回だけ 1ファイルのデモから機械的に割ったが、その生成スクリプトはもう使わない。

## 収集について

`scripts/collect.py` は標準ライブラリだけで動く（CI で `pip install` を挟まないため）。

対象は公式API/フィードに限る。現在:

| ソース | 取得するもの | 備考 |
| --- | --- | --- |
| Hacker News API | タイトル・スコア・コメント数 | キー不要 |
| Wikipedia (ja) おまかせ表示 | 記事名・要約の冒頭 | キー不要 |
| Open-Meteo | 東京の天気 | キー不要 |
| RSS/Atom | タイトル・要約の冒頭 | `RSS_FEEDS` に足す |

守っていること:

- スクレイピングはしない。公式API/フィードだけを叩く
- 本文を丸ごと転載しない。タイトルと要約の冒頭（92文字）まで
- カードから収集元へリンクする（転載ではなく参照であることを示す）
- User-Agent を名乗り、リクエストの間に間隔を置く
- 収穫が4件未満のときは **書き込まずに異常終了** する。
  前回の `fragments.json` がそのまま残るので、ソースが落ちてもページは生き続ける

フィードを足すときは、対象の robots.txt と利用規約を確認してから
`RSS_FEEDS` に `("タグ", "https://…/feed.xml")` を追加する。

## 手元で動かす

```sh
python3 scripts/collect.py     # fragments.json を更新
python3 -m http.server 8899    # http://localhost:8899/
```

`fragments.json` が読めないときはサンプルデータに落ちる。
画面右上の `FEED:` がどちらの状態か示す。
