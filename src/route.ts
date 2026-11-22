// Which page to show, read from the address in the browser. The app has two
// pages, so a small function does the job a routing library would.

export type Route = { page: "list" } | { page: "item"; id: number } | { page: "not_found" };

/** The address of an item's page. */
export const itemPath = (id: number) => `/items/${id}`;

/** The address of the list. */
export const LIST_PATH = "/";

/** Reads the page to show from an address path, such as "/items/12". */
export function routeFrom(path: string): Route {
  // A trailing slash is easy to type by hand and means the same page.
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (trimmed === LIST_PATH) return { page: "list" };

  const match = /^\/items\/(\d{1,15})$/.exec(trimmed);
  if (match) return { page: "item", id: Number(match[1]) };

  return { page: "not_found" };
}
