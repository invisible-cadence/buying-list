import { useId } from "react";
import { ITEM_TYPES, STATUSES } from "../shared/items";
import { NEEDED_SOON_DAYS, NO_FILTERS, SORT_ORDERS, isNarrowed, type FindOptions } from "./find";
import { SORT_LABELS, STATUS_LABELS, TYPE_LABELS } from "./labels";

type Props = {
  options: FindOptions;
  onChange: (options: FindOptions) => void;
  /** How many items are showing, and how many there would be with no filters. */
  shown: number;
  total: number;
};

/**
 * The search box, and the filters and sort in a fold-out beneath it. It only
 * reports choices; find.ts does the matching.
 */
export function FindBar({ options, onChange, shown, total }: Props) {
  const id = useId();

  function set<K extends keyof FindOptions>(key: K, value: FindOptions[K]) {
    onChange({ ...options, [key]: value });
  }

  return (
    <div className="find">
      <label htmlFor={`${id}-search`}>Search</label>
      <input
        id={`${id}-search`}
        type="search"
        value={options.search}
        onChange={(event) => set("search", event.target.value)}
        placeholder="Title or notes"
        autoComplete="off"
      />

      <details>
        <summary>Filter and sort</summary>
        <div className="stack">
          <label htmlFor={`${id}-type`}>Type</label>
          <select
            id={`${id}-type`}
            value={options.type}
            onChange={(event) => set("type", event.target.value as FindOptions["type"])}
          >
            <option value="all">All types</option>
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          <label htmlFor={`${id}-status`}>Status</label>
          <select
            id={`${id}-status`}
            value={options.status}
            onChange={(event) => set("status", event.target.value as FindOptions["status"])}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <label htmlFor={`${id}-sort`}>Sort</label>
          <select
            id={`${id}-sort`}
            value={options.sort}
            onChange={(event) => set("sort", event.target.value as FindOptions["sort"])}
          >
            {SORT_ORDERS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>

          <label className="check">
            <input
              type="checkbox"
              checked={options.neededSoon}
              onChange={(event) => set("neededSoon", event.target.checked)}
            />
            Needed soon (next {NEEDED_SOON_DAYS} days, or overdue)
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={options.showArchived}
              onChange={(event) => set("showArchived", event.target.checked)}
            />
            Show archived
          </label>
        </div>
      </details>

      {/* Always visible, even with the fold-out closed, so a forgotten filter
          never makes items seem lost. */}
      {isNarrowed(options) && (
        <p className="row narrowed" role="status">
          <span>
            Showing {shown} of {total}
          </span>
          <button type="button" onClick={() => onChange(NO_FILTERS)}>
            Clear
          </button>
        </p>
      )}
    </div>
  );
}
