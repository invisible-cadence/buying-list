import type { Item } from "../shared/items";
import { BoughtForm } from "./BoughtForm";
import { summaryOf } from "./format";
import { MoveSelect } from "./MoveSelect";
import { Link } from "./navigation";
import { itemPath } from "./route";
import { useStatusMove } from "./useStatusMove";

type Props = {
  item: Item;
  /** Called with the item as the server sent it back after a change. */
  onChanged: (item: Item) => void;
};

/**
 * One item in the list: its title, which opens the item's page, a line of
 * details, and a way to move it to another status. The row makes its own
 * request, so it can show its own "saving" state and error right where the
 * person tapped.
 */
export function ItemRow({ item, onChanged }: Props) {
  const { buying, saving, error, choose, move, cancelBuying } = useStatusMove(item, onChanged);
  const details = summaryOf(item);

  return (
    <li>
      <div className="item">
        <div>
          <Link to={itemPath(item.id)}>{item.title}</Link>
          {details && <div className="details">{details}</div>}
        </div>
        <MoveSelect item={item} disabled={saving || buying} onChoose={choose} />
      </div>
      {buying && (
        <BoughtForm
          saving={saving}
          onSave={(change) => void move(change)}
          onCancel={cancelBuying}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
