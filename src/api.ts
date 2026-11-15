export type Item = {
  id: number;
  title: string;
  createdAt: string;
};

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
