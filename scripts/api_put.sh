#!/usr/bin/env bash
# GitHub Contents API 経由でファイルを1つ置く（git push を通さない）。
#
#     scripts/api_put.sh <リポジトリ内のパス> [コミットメッセージ]
#
# なぜ要るか:
#   このリポジトリは deploy key で push する設定になっている（core.sshCommand）。
#   deploy key では .github/workflows/ を含む push が拒否され、gh のトークンに
#   workflow スコープを足しても迂回できない。Contents API はトークンを使う
#   別経路なので、この制限を踏まない。
#
#   Termux などで HTTPS クローン + `gh auth setup-git` にしている環境なら、
#   workflow スコープさえあれば普通に push できる。その場合これは要らない。
#
# 注意:
#   API 経由のコミットは **ローカルの git config を見ない**。既定ではトークン
#   所有者の名義（実アドレス）が公開ログに残るため、author/committer を明示する。

set -euo pipefail

NAME="Pepstech"
EMAIL="278710858+wadako1jp-glitch@users.noreply.github.com"

die() { printf '%s\n' "$*" >&2; exit 1; }

[ $# -ge 1 ] || die "使い方: scripts/api_put.sh <リポジトリ内のパス> [コミットメッセージ]"

REL=${1#./}
MSG=${2:-"Update ${REL}"}

command -v gh  >/dev/null || die "gh が無い。Termux なら: pkg install gh"
command -v git >/dev/null || die "git が無い。Termux なら: pkg install git"

ROOT=$(git rev-parse --show-toplevel) || die "git リポジトリの中で実行すること。"
cd "$ROOT"

[ -f "$REL" ] || die "ファイルが無い: $REL"

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# workflow ファイルはスコープが無いと 403 になる。叩く前に見ておく。
case "$REL" in
  .github/workflows/*)
    gh auth status 2>&1 | grep -q "'workflow'" \
      || die "トークンに workflow スコープが無い。先に:
  gh auth refresh -h github.com -s workflow"
    ;;
esac

# BSD(macOS) は -i、GNU(Termux/Linux) は -w0。両対応にする。
b64() { base64 -w0 "$1" 2>/dev/null || base64 -i "$1" | tr -d '\n'; }

# 既存ファイルの更新には blob sha が要る。新規なら空のまま。
# 404 のとき gh はエラー JSON を stdout に吐くので、失敗時は明示的に捨てる
# （`|| true` だとその JSON が SHA に入ってしまう）。
if ! SHA=$(gh api "repos/${REPO}/contents/${REL}?ref=${BRANCH}" -q .sha 2>/dev/null); then
  SHA=""
fi

printf '%s\n' \
  "リポジトリ : ${REPO}" \
  "ブランチ   : ${BRANCH}" \
  "パス       : ${REL}" \
  "メッセージ : ${MSG}" \
  "操作       : $([ -n "$SHA" ] && echo "更新 (${SHA:0:7})" || echo '新規作成')" \
  "名義       : ${NAME} <${EMAIL}>"
printf '\nこの内容で公開リポジトリにコミットする。よければ y: '
read -r ans
[ "$ans" = "y" ] || die "中止した。"

set -- -X PUT "repos/${REPO}/contents/${REL}" \
  -f "message=${MSG}" \
  -f "branch=${BRANCH}" \
  -f "content=$(b64 "$REL")" \
  -f "author[name]=${NAME}" \
  -f "author[email]=${EMAIL}" \
  -f "committer[name]=${NAME}" \
  -f "committer[email]=${EMAIL}"
if [ -n "$SHA" ]; then set -- "$@" -f "sha=${SHA}"; fi

COMMIT=$(gh api "$@" -q .commit.sha)

printf '\n置いた: %s\n' "${COMMIT:0:7}"
printf 'ローカルは1つ遅れている。取り込む:\n  git pull --ff-only\n'
