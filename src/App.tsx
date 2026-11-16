import { useEffect, useState, type FormEvent } from "react";
import { addItem, listItems, type Item } from "./api";

// Must match MAX_TITLE_LENGTH in worker/items.ts, which is what actually enforces it.
const MAX_TITLE_LENGTH = 200;

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the list once, when the page first appears.
  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((e: unknown) => {
        setLoadFailed(true);
        setError(messageFrom(e));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "" || saving) return;

    setSaving(true);
    setError(null);
    try {
      const item = await addItem(title);
      setItems((current) => [item, ...current]);
      setTitle("");
    } catch (e) {
      setError(messageFrom(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1>Buying list</h1>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="title">What do we need to buy?</label>
        <div className="row">
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            autoComplete="off"
          />
          <button type="submit" disabled={saving || title.trim() === ""}>
            Add
          </button>
        </div>
      </form>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      ) : (
        // After a failed load the error above is the whole story. An empty
        // message would suggest the list is empty when it is just unknown.
        !loadFailed && <p>Nothing here yet.</p>
      )}
    </main>
  );
}

function messageFrom(error: unknown): string {
  // When the sign-in has expired, Cloudflare answers with a redirect to its
  // login page, which the browser reports as a network failure. A reload
  // sends the person to sign in again.
  if (error instanceof TypeError) {
    return "Could not reach the server. Reload the page, and sign in again if asked.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
