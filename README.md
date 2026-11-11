# buying-list

A shared household buying list, installed on your phone, that tracks things from idea to bought and does the product research for you.

## Status

Early setup. There is no app code yet. This repository currently holds the plan, the working rules and the safeguards that come before the first line of code.

- [`ROADMAP.md`](ROADMAP.md): what is being built, in what order.
- [`docs/decisions/`](docs/decisions/): why it is being built this way, and what else was considered.
- [`SECURITY.md`](SECURITY.md): how the app and this repository are protected, and how to report a problem.
- [`AGENTS.md`](AGENTS.md): the rules that AI coding agents follow here.

This README will grow into a full guide, with setup steps for running your own copy, as the app takes shape.

## How this is built

The project is built in the open, one reviewed pull request at a time, with AI coding agents doing much of the writing. Every pull request explains why its approach was chosen.

## Pre-push check

Everything pushed to a public repository is public straight away, so this repository includes a check that runs on your own computer before anything leaves it.

It refuses a push if a commit:

- was written under the wrong name or email, or
- contains a term from your private list, in its changes, file names, commit message or branch name.

The script is in [`.githooks/pre-push`](.githooks/pre-push). It contains no private terms. It reads them from a file that you keep outside the repository.

### Setup

Do this once for each copy of the repository. On Windows, run the commands in Git Bash, which is installed with [Git for Windows](https://git-scm.com/downloads).

1. Create your private list: a plain text file with one term per line, saved outside this repository. The default location is a file named `.private-terms.txt` in your home folder. Lines starting with `#` are ignored, and matching ignores upper and lower case.

2. Tell git who the commits should be from, and what the check should expect. Use your own public name and email.

   ```bash
   git config user.name "YOUR PUBLIC NAME"
   git config user.email "YOUR PUBLIC EMAIL"
   git config prepush.authorName "YOUR PUBLIC NAME"
   git config prepush.authorEmail "YOUR PUBLIC EMAIL"
   ```

3. Switch the check on.

   ```bash
   git config core.hooksPath .githooks
   ```

4. If your list is somewhere other than the default location, say where.

   ```bash
   git config prepush.termsFile "/path/to/your/file"
   ```

### Check that it works

Make a throwaway commit containing one of your terms on a test branch, and try to push it. The push should be refused, and nothing is sent. Then delete the test branch.

### What it does not cover

- Text typed on github.com, such as pull request descriptions and comments.
- Images and other binary files.
- Pushes made from anywhere the check is not set up, including cloud coding agents.
- Details that are not on your list.

It can be skipped with `git push --no-verify`. Do not do that.

## Licence

[MIT](LICENSE)
