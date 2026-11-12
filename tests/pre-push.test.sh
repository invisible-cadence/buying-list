#!/bin/sh
# Tests for the pre-push check in .githooks/pre-push.
#
# Run from anywhere:   sh tests/pre-push.test.sh
#
# The tests build a throwaway repository and a pretend remote in a temporary
# folder, switch the check on there, and try a series of pushes. Nothing
# touches this repository, GitHub or your real private list. The private
# terms used here are made up.

here=$(cd "$(dirname "$0")" && pwd)
hooks="$here/../.githooks"

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT

passed=0
failed=0

# expect <refused|allowed> <description> <command...>
expect() {
    want="$1"
    label="$2"
    shift 2
    if "$@" > "$tmp/out" 2>&1; then got="allowed"; else got="refused"; fi
    if [ "$got" = "$want" ]; then
        passed=$((passed + 1))
        echo "ok    $label"
    else
        failed=$((failed + 1))
        echo "FAIL  $label (expected $want, was $got)"
        sed 's/^/        /' "$tmp/out"
    fi
}

commit() {
    git add -A && git commit -q -m "$1"
}

undo() {
    git reset -q --hard "HEAD~$1"
}

# A pretend remote and a working repository.
git init -q --bare "$tmp/remote.git"
git init -q "$tmp/work"
cd "$tmp/work" || exit 1
git remote add origin "$tmp/remote.git"
git config user.name "Public Name"
git config user.email "public@example.com"
git config commit.gpgsign false
git config core.hooksPath "$hooks"

echo "hello" > a.txt
commit "First commit"

# A check that is not set up must refuse, not pass silently.
expect refused "1  identity not configured" git push -q origin HEAD:main

git config prepush.authorName "Public Name"
git config prepush.authorEmail "public@example.com"
git config prepush.termsFile "$tmp/terms.txt"
expect refused "2  private list missing" git push -q origin HEAD:main

# Notepad on Windows saves files with CRLF line endings. A blank line must
# not be treated as a term, because it would match every line.
printf '# made-up terms\r\n\r\nZebrawood\r\nsecret street\r\n' > "$tmp/terms.txt"
expect allowed "3  clean commit, list with Windows line endings and a blank line" git push -q origin HEAD:main

echo "we live on Secret Street" > b.txt
commit "Add b"
expect refused "4  term in a file, in different capitals" git push -q origin HEAD:main

# Removing the term later does not help: the earlier commit still has it.
git rm -q b.txt
git commit -q -m "Remove b"
expect refused "5  term added, then removed in a later commit" git push -q origin HEAD:main
undo 2

echo "x" > c.txt
commit "Thanks zebrawood for the idea"
expect refused "6  term in a commit message" git push -q origin HEAD:main
undo 1

echo "x" > zebrawood-notes.txt
commit "Add notes"
expect refused "7  term in a file name" git push -q origin HEAD:main
undo 1

echo "y" > d.txt
commit "Add d"
expect refused "8  term in the branch name" git push -q origin HEAD:feature/zebrawood
# The same commit under a clean name, to prove case 8 failed for the name alone.
expect allowed "9  same commit, clean branch name" git push -q origin HEAD:feature/ok

echo "z" > e.txt
git add -A
git -c user.name="Other Person" -c user.email="other@example.org" commit -q -m "Add e"
expect refused "10 wrong author and committer" git push -q origin HEAD:main
undo 1

# A commit can have a different author and committer.
echo "z" > e.txt
git add -A
git commit -q -m "Add e" --author="Other Person <other@example.org>"
expect refused "11 wrong author only" git push -q origin HEAD:main
undo 1

expect allowed "12 clean push" git push -q origin HEAD:main
expect allowed "13 deleting a remote branch" git push -q origin :feature/ok

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
