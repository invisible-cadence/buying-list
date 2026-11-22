import { STATUSES, type Item, type Status } from "../shared/items";
import { STATUS_LABELS } from "./labels";

type Props = {
  item: Item;
  disabled: boolean;
  onChoose: (status: Status) => void;
};

/**
 * The Move to menu. It always shows "Move to…" rather than the current
 * status, because it is an action, not a setting.
 */
export function MoveSelect({ item, disabled, onChoose }: Props) {
  return (
    <select
      aria-label={`Move ${item.title} to`}
      value=""
      onChange={(event) => onChoose(event.target.value as Status)}
      disabled={disabled}
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
  );
}
