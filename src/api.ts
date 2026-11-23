import type { Item, ItemType, Priority, Status } from "../shared/items";

// The only file that calls the API. Each function sends one request and gives
// back what the API answered, or throws an Error carrying the API's own
// message, which the screen shows as it is.

/** Reads the error message the API sends, or falls back to a generic one. */
async function failure(response: Response): Promise<Error> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      return new Error(String(body.error));
    }
  } catch {
    // The body was not JSON. Use the generic message below.
  }
  return new Error(`The request failed (status ${response.status}).`);
}

/**
 * Sends a request for one item and gives back the item as the API now has it.
 * Every route that changes an item answers with the whole item.
 */
async function itemRequest(path: string, method = "GET", body?: unknown): Promise<Item> {
  const response = await fetch(path, {
    method,
    // The API requires the JSON header on every change, even with no body.
    headers: method === "GET" ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response);
  return ((await response.json()) as { item: Item }).item;
}

/** Every item, archived ones included. The screen decides which to show. */
export async function listItems(): Promise<Item[]> {
  const response = await fetch("/api/items?archived=true");
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { items: Item[] };
  return body.items;
}

export function getItem(id: number): Promise<Item> {
  return itemRequest(`/api/items/${id}`);
}

/** Adds an item. A private one is seen only by the person who added it. */
export function addItem(title: string, isPrivate = false): Promise<Item> {
  return itemRequest("/api/items", "POST", isPrivate ? { title, isPrivate } : { title });
}

/** The email of the person signed in, as the server read it from the sign-in token. */
export async function getMe(): Promise<string> {
  const response = await fetch("/api/me");
  if (!response.ok) throw await failure(response);
  return ((await response.json()) as { email: string }).email;
}

/** The fields an edit can change. Any left out stay as they are; null clears a date or budget. */
export type ItemChanges = {
  title?: string;
  notes?: string;
  type?: ItemType;
  priority?: Priority;
  neededBy?: string | null;
  budgetCents?: number | null;
  /** Only the person who added the item may send this. */
  isPrivate?: boolean;
};

export function updateItem(id: number, changes: ItemChanges): Promise<Item> {
  return itemRequest(`/api/items/${id}`, "PATCH", changes);
}

/** What can be sent when moving an item. The purchase details go only with "bought". */
export type StatusChange =
  | { status: Exclude<Status, "bought"> }
  | { status: "bought"; boughtOn?: string; paidCents?: number; boughtFrom?: string };

/** Moves an item to another status. */
export function changeStatus(id: number, change: StatusChange): Promise<Item> {
  return itemRequest(`/api/items/${id}/status`, "POST", change);
}

/** Hides an item from the list, or brings it back. */
export function setArchived(id: number, archived: boolean): Promise<Item> {
  return itemRequest(`/api/items/${id}/${archived ? "archive" : "unarchive"}`, "POST");
}

/** Deletes an item and its links for good. There is no way to bring it back. */
export async function deleteItem(id: number): Promise<void> {
  const response = await fetch(`/api/items/${id}`, {
    method: "DELETE",
    // The API requires the JSON header on every change, even with no body.
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw await failure(response);
}

export function addLink(id: number, link: { url: string; label?: string }): Promise<Item> {
  return itemRequest(`/api/items/${id}/links`, "POST", link);
}

export function removeLink(id: number, linkId: number): Promise<Item> {
  return itemRequest(`/api/items/${id}/links/${linkId}`, "DELETE");
}

/** Turns a failed request into a sentence for the screen. */
export function errorMessage(error: unknown): string {
  // When the sign-in has expired, Cloudflare answers with a redirect to its
  // login page, which the browser reports as a network failure. A reload
  // sends the person to sign in again.
  if (error instanceof TypeError) {
    return "Could not reach the server. Reload the page, and sign in again if asked.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
