import { useState } from "react";
import { STATUSES, type Item, type Status } from "../shared/items";
import { changeStatus, errorMessage, type StatusChange } from "./api";
import { BoughtForm } from "./BoughtForm";
import { formatDate, formatMoney } from "./format";
import { STATUS_LABELS } from "./groups";

type Props = {
  item: Item;
  /** Called with the item as the server sent it back after a change. */
  onChanged: (item: Item) => void;
};

/**
 * One item in the list: its title, a line of details, and a way to move it to
 * another status. The row makes its own request, so it can show its own
 * "saving" state and error right where the person tapped.
 */
export function ItemRow({ item, onChanged }: Props) {
  const [buying, setBuying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(change: StatusChange) {
    setSaving(true);
    setError(null);
    try {
      onChanged(await changeStatus(item.id, change));
      setBuying(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleMove(to: Status) {
    // Buying asks for the price and shop first. Every other move happens at once.
    if (to === "bought") {
      setBuying(true);
    } else {
      void move({ status: to });
    }
  }

  const details = detailsOf(item);

  return (
    <li>
      <div className="item">
        <div>
          <div>{item.title}</div>
          {details && <div className="details">{details}</div>}
        </div>
        <select
          aria-label={`Move ${item.title} to`}
          // Always shows "Move to…": the select is an action, not a setting.
          value=""
          onChange={(event) => handleMove(event.target.value as Status)}
          disabled={saving || buying}
        >
          <option value="" disabled>
            Move to…
          </option>
          {STATUSES.filter((status) => status !== item.status).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      {buying && (
        <BoughtForm
          saving={saving}
          onSave={(change) => void move(change)}
          onCancel={() => {
            setBuying(false);
            setError(null);
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </li>
  );
}

/** The short line under the title: what was paid for a bought item, otherwise the plans. */
function detailsOf(item: Item): string {
  if (item.status === "bought") {
    // Reads as a sentence, such as "Bought for 24.99 at Example Shop on 20 Nov 2026".
    const parts = ["Bought"];
    if (item.paidCents !== null) parts.push(`for ${formatMoney(item.paidCents)}`);
    if (item.boughtFrom !== "") parts.push(`at ${item.boughtFrom}`);
    if (item.boughtOn !== null) parts.push(`on ${formatDate(item.boughtOn)}`);
    return parts.join(" ");
  }
  const parts: string[] = [];
  if (item.priority === "high") parts.push("High priority");
  if (item.budgetCents !== null) parts.push(`Budget ${formatMoney(item.budgetCents)}`);
  if (item.neededBy !== null) parts.push(`Needed by ${formatDate(item.neededBy)}`);
  return parts.join(" · ");
}
