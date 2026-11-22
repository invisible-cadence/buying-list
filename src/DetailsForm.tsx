import { useId, useState, type FormEvent } from "react";
import {
  ITEM_TYPES,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  PRIORITIES,
  type Item,
} from "../shared/items";
import { errorMessage, updateItem } from "./api";
import { changesFrom, formValuesOf, type FormValues } from "./itemForm";
import { PRIORITY_LABELS, TYPE_LABELS } from "./labels";

type Props = {
  item: Item;
  /** Called with the item as the server sent it back after a save. */
  onSaved: (item: Item) => void;
};

/**
 * The item page's form for everything except status and links. One Save sends
 * only the fields that changed (see itemForm.ts).
 */
export function DetailsForm({ item, onSaved }: Props) {
  const [values, setValues] = useState(() => formValuesOf(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const id = useId();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // An old message no longer describes what is in the boxes.
    setError(null);
    setNote(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = changesFrom(item, values);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    if (Object.keys(result.changes).length === 0) {
      setNote("Nothing has changed.");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateItem(item.id, result.changes);
      onSaved(saved);
      // Show what the server stored, such as a budget of "60" as "60.00".
      setValues(formValuesOf(saved));
      setNote("Saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
      <h2>Details</h2>

      <label htmlFor={`${id}-title`}>Title</label>
      <input
        id={`${id}-title`}
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
        maxLength={MAX_TITLE_LENGTH}
        autoComplete="off"
      />

      <label htmlFor={`${id}-notes`}>Notes</label>
      <textarea
        id={`${id}-notes`}
        value={values.notes}
        onChange={(event) => set("notes", event.target.value)}
        maxLength={MAX_NOTES_LENGTH}
        rows={4}
      />

      <label htmlFor={`${id}-type`}>Type</label>
      <select
        id={`${id}-type`}
        value={values.type}
        onChange={(event) => set("type", event.target.value as FormValues["type"])}
      >
        {ITEM_TYPES.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-priority`}>Priority</label>
      <select
        id={`${id}-priority`}
        value={values.priority}
        onChange={(event) => set("priority", event.target.value as FormValues["priority"])}
      >
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-needed-by`}>Needed by (optional)</label>
      <input
        id={`${id}-needed-by`}
        type="date"
        value={values.neededBy}
        onChange={(event) => set("neededBy", event.target.value)}
      />

      <label htmlFor={`${id}-budget`}>Budget (optional)</label>
      <input
        id={`${id}-budget`}
        value={values.budget}
        onChange={(event) => set("budget", event.target.value)}
        inputMode="decimal"
        autoComplete="off"
      />

      {error && <p role="alert">{error}</p>}
      {note && <p role="status">{note}</p>}
      <div className="row">
        <button type="submit" disabled={saving}>
          Save
        </button>
      </div>
    </form>
  );
}
