// What the front end and the Worker must agree on. Both import from here, so
// there is one place to change. Keep this file free of code that only runs in
// a browser or only on the Worker, because both sides compile it.

/** The longest title an item may have. The Worker enforces it; the screen uses it to stop typing. */
export const MAX_TITLE_LENGTH = 200;

/** An item as the API sends it. */
export type Item = {
  id: number;
  title: string;
  createdAt: string;
};
