# 0008: Plain React screens

- **Date:** 2026-11-21
- **Status:** accepted

## What had to be decided

Phase 2 brings the first real screens: the list grouped by status, quick-add, and moving an item between statuses. How should the front end be built, given that the aim is something usable on a phone soon, by a project owner who is new to web development?

## Decision

- **Plain React and plain CSS.** No component library, no CSS framework, no icon font and no state-management library. The test for the styling is "could I use this at the shops?", not "is it pretty?".
- **Small pieces, each with one job.** The main screen holds the list. Each piece that changes something (quick-add, an item's row) makes its own request and shows its own "saving" state and error, right where the person tapped. When a request succeeds, the piece hands the item the server sent back to the main screen, which swaps it in. The screen never guesses what the server did. This is the same "write, then re-read" rule the API follows.
- **Built-in controls.** Moving an item is a native drop-down, and the Bought section folds away with the browser's own `<details>` element. Both work well with phone screen readers and need no code to open or close.
- **Tests for the logic, not the screens.** Grouping by status and reading a typed price are plain functions with unit tests. The screens themselves are checked by hand on a phone-sized browser. Browser tests can come later if real use shows the screens breaking.

## Options considered

- **A component library** such as Material UI. Polished and consistent, but a large dependency with its own way of doing things to learn, and polish is not what the trial needs.
- **A state-management library** such as Redux or Zustand. Useful when many distant parts of a screen share changing data. Here one screen holds one list, which React's own `useState` handles.
- **Fetching in the main screen only,** with the pieces just reporting taps. Fewer places make requests, but the main screen would have to track "saving" and errors for every row, and errors would show far from where the person tapped.
- **Component tests** with Testing Library and a fake browser. Worth adding when the screens hold more behaviour. For now they would mostly test React itself.

## Cost

Nothing. No new dependencies.

## What would change this decision

- The screens growing enough shared state that passing it down becomes awkward.
- Real use showing bugs in the screens that unit tests on the logic would not catch, which would justify component or browser tests.
