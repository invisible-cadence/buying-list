import { useId, useState, type FormEvent } from "react";
import { MAX_LABEL_LENGTH } from "../shared/items";
import type { StatusChange } from "./api";
import { localToday, parseMoney } from "./format";

type Props = {
  saving: boolean;
  onSave: (change: StatusChange) => void;
  onCancel: () => void;
};

/**
 * The small form that opens under an item when it is moved to "bought". Every
 * field is optional, and the date starts as today on the phone.
 */
export function BoughtForm({ saving, onSave, onCancel }: Props) {
  const [price, setPrice] = useState("");
  const [shop, setShop] = useState("");
  const [date, setDate] = useState(localToday);
  const [error, setError] = useState<string | null>(null);
  // Each item has its own form, so the labels need ids that do not clash.
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseMoney(price);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    // Leave out what was not filled in, so the API uses its own defaults.
    const change: StatusChange = { status: "bought" };
    if (parsed.cents !== null) change.paidCents = parsed.cents;
    if (shop.trim() !== "") change.boughtFrom = shop.trim();
    if (date !== "") change.boughtOn = date;
    onSave(change);
  }

  return (
    <form className="bought-form" onSubmit={handleSubmit}>
      <label htmlFor={`${id}-price`}>Price paid (optional)</label>
      <input
        id={`${id}-price`}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        // Shows the number keyboard, with a decimal mark, on phones.
        inputMode="decimal"
        autoComplete="off"
      />
      <label htmlFor={`${id}-shop`}>Shop (optional)</label>
      <input
        id={`${id}-shop`}
        value={shop}
        onChange={(event) => setShop(event.target.value)}
        maxLength={MAX_LABEL_LENGTH}
        autoComplete="off"
      />
      <label htmlFor={`${id}-date`}>Date</label>
      <input
        id={`${id}-date`}
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <div className="row">
        <button type="submit" disabled={saving}>
          Save
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
