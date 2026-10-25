#!/usr/bin/env bash
# Git governance checks shared by the local hooks (.githooks/) and CI.
#
#   validate.sh commit-msg <file>      check one commit message file
#   validate.sh branch [name]          check a branch name (default: current)
#   validate.sh title <title>          check a PR title (it becomes the squash subject)
#   validate.sh range <base> <head>    check every commit subject in base..head
#   validate.sh pre-push               block pushes to protected branches (reads git's pre-push stdin)
set -euo pipefail

TYPES='feat|fix|refactor|docs|test|chore'
PROTECTED='dev|master'
SUBJECT_RE="^(${TYPES})(\([a-z0-9._/-]+\))?!?: .+"
BRANCH_RE="^(${TYPES}|release|hotfix)/[a-z0-9][a-z0-9._-]*$"

fail() {
  echo "✖ $1" >&2
  shift
  for line in "$@"; do echo "  $line" >&2; done
  exit 1
}

check_subject() {
  local subject="$1"
  # Merge and revert commits are written by git itself.
  if [[ "$subject" =~ ^(Merge|Revert)\  ]]; then return 0; fi
  if [[ ! "$subject" =~ $SUBJECT_RE ]]; then
    fail "Commit message không đúng quy ước: \"$subject\"" \
      "Định dạng: type(scope): mô tả   (scope không bắt buộc)" \
      "type: ${TYPES//|/, }" \
      "Ví dụ: fix(api): reject empty order items"
  fi
}

check_branch() {
  local branch="$1"
  if [[ "$branch" =~ ^(${PROTECTED})$ ]]; then
    fail "Không commit trực tiếp trên '$branch'." \
      "Tạo nhánh riêng: git switch -c feat/<ten-viec>, rồi mở PR vào dev."
  fi
  if [[ ! "$branch" =~ $BRANCH_RE ]]; then
    fail "Tên nhánh không đúng quy ước: '$branch'" \
      "Định dạng: <type>/<ten-viec> hoặc release|hotfix/<ten>, chữ thường, số, dấu - . _" \
      "type: ${TYPES//|/, }" \
      "Ví dụ: feat/customer-import, fix/login-redirect, release/1.2.0, hotfix/out-of-stock"
  fi
}

case "${1:-}" in
  commit-msg)
    [[ -n "${2:-}" ]] || fail "Thiếu đường dẫn file commit message."
    check_subject "$(grep -v '^#' "$2" | sed -n '/[^[:space:]]/{p;q;}')"
    ;;
  branch)
    branch="${2:-$(git symbolic-ref --quiet --short HEAD || true)}"
    # Detached HEAD (rebase, bisect): nothing to check.
    [[ -n "$branch" ]] || exit 0
    check_branch "$branch"
    ;;
  title)
    [[ -n "${2:-}" ]] || fail "Thiếu tiêu đề PR."
    check_subject "$2"
    ;;
  range)
    [[ -n "${2:-}" && -n "${3:-}" ]] || fail "Cách dùng: validate.sh range <base> <head>"
    while IFS= read -r subject; do
      check_subject "$subject"
    done < <(git log --no-merges --format=%s "$2..$3")
    ;;
  pre-push)
    # stdin: <local ref> <local sha> <remote ref> <remote sha>, one line per ref
    while read -r _ _ remote_ref _; do
      if [[ "$remote_ref" =~ ^refs/heads/(${PROTECTED})$ ]]; then
        fail "Không push trực tiếp lên '${BASH_REMATCH[1]}'." \
          "Đẩy nhánh riêng rồi mở PR vào dev; chỉ merge khi CI xanh."
      fi
    done
    ;;
  *)
    fail "Cách dùng: validate.sh commit-msg <file> | branch [name] | title <tên-PR> | range <base> <head> | pre-push"
    ;;
esac
