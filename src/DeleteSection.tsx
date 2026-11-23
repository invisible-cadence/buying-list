import { useState } from "react";
import type { Item } from "../shared/items";
import { deleteItem, errorMessage } from "./api";

type Props = {
  item: Item;
  /** Called once the server has deleted the item. */
  onDeleted: (id: number) => void;
};

/**
 * Deleting an item, at the bottom of its page. Unlike archiving, it cannot be
 * undone, so the first tap only asks, and a second tap deletes.
 */
export function DeleteSection({ item, onDeleted }: Props) {
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteItem(item.id);
      onDeleted(item.id);
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <section className="stack">
      <h2>Delete</h2>
      {asking ? (
        <>
          <p>Delete “{item.title}” and its links for good? This cannot be undone.</p>
          <div className="row">
            <button type="button" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete for good"}
            </button>
            <button type="button" onClick={() => setAsking(false)} disabled={deleting}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="details">
            Removes the item for good. To only hide it from the list, archive it instead.
          </p>
          <div className="row">
            <button type="button" onClick={() => setAsking(true)}>
              Delete…
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
