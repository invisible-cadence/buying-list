import type { Item, Status } from "../shared/items";

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

export async function listItems(): Promise<Item[]> {
  const response = await fetch("/api/items");
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { items: Item[] };
  return body.items;
}

export async function addItem(title: string): Promise<Item> {
  const response = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { item: Item };
  return body.item;
}

/** What can be sent when moving an item. The purchase details go only with "bought". */
export type StatusChange =
  | { status: Exclude<Status, "bought"> }
  | { status: "bought"; boughtOn?: string; paidCents?: number; boughtFrom?: string };

/** Moves an item to another status, and gives back the item as it now is. */
export async function changeStatus(id: number, change: StatusChange): Promise<Item> {
  const response = await fetch(`/api/items/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(change),
  });
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { item: Item };
  return body.item;
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
