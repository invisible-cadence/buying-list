import type { Item } from "../shared/items";
import { STATUS_LABELS, type StatusGroup } from "./groups";
import { ItemRow } from "./ItemRow";

type Props = {
  group: StatusGroup;
  onChanged: (item: Item) => void;
};

/**
 * One status heading and its items. "Bought" is folded away by default, so it
 * does not grow into a wall as the weeks go by. A tap on its heading opens it.
 */
export function StatusSection({ group, onChanged }: Props) {
  const heading = `${STATUS_LABELS[group.status]} (${group.items.length})`;
  const list = (
    <ul className="items">
      {group.items.map((item) => (
        <ItemRow key={item.id} item={item} onChanged={onChanged} />
      ))}
    </ul>
  );

  if (group.status === "bought") {
    return (
      <details>
        <summary>
          <h2>{heading}</h2>
        </summary>
        {list}
      </details>
    );
  }
  return (
    <section>
      <h2>{heading}</h2>
      {list}
    </section>
  );
}
