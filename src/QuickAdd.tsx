import { useState, type FormEvent } from "react";
import { MAX_TITLE_LENGTH, type Item } from "../shared/items";
import { addItem, errorMessage } from "./api";

/** The box at the top: type a title, tap Add. Everything else is set later. */
export function QuickAdd({ onAdded }: { onAdded: (item: Item) => void }) {
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "" || saving) return;

    setSaving(true);
    setError(null);
    try {
      onAdded(await addItem(title, isPrivate));
      setTitle("");
      setIsPrivate(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
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
      <label className="check">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(event) => setIsPrivate(event.target.checked)}
        />
        Private (only you will see it)
      </label>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
