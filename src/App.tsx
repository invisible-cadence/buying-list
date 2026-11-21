import { useEffect, useState } from "react";
import type { Item } from "../shared/items";
import { errorMessage, listItems } from "./api";
import { groupByStatus } from "./groups";
import { QuickAdd } from "./QuickAdd";
import { StatusSection } from "./StatusSection";

/**
 * The main screen. It holds the list and hands each part what it needs. The
 * parts make their own requests and give back the item the server returned,
 * which replaces the old copy here. The screen never guesses what changed.
 */
export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load the list once, when the page first appears.
  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((e: unknown) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleAdded(item: Item) {
    setItems((current) => [item, ...current]);
  }

  function handleChanged(changed: Item) {
    setItems((current) => current.map((item) => (item.id === changed.id ? changed : item)));
  }

  const groups = groupByStatus(items);

  return (
    <main>
      <h1>Buying list</h1>
      <QuickAdd onAdded={handleAdded} />

      {loading ? (
        <p>Loading…</p>
      ) : loadError ? (
        // After a failed load the error is the whole story. "Nothing here yet"
        // would suggest the list is empty when it is just unknown.
        <p role="alert">{loadError}</p>
      ) : groups.length > 0 ? (
        groups.map((group) => (
          <StatusSection key={group.status} group={group} onChanged={handleChanged} />
        ))
      ) : (
        <p>Nothing here yet.</p>
      )}
    </main>
  );
}
