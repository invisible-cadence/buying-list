import type { Item } from "../shared/items";
import { groupByStatus } from "./groups";
import { QuickAdd } from "./QuickAdd";
import { StatusSection } from "./StatusSection";

type Props = {
  items: Item[];
  loading: boolean;
  loadError: string | null;
  onAdded: (item: Item) => void;
  onChanged: (item: Item) => void;
};

/** The list: quick-add at the top, then one section per status. */
export function ListPage({ items, loading, loadError, onAdded, onChanged }: Props) {
  const groups = groupByStatus(items);

  return (
    <main>
      <h1>Buying list</h1>
      <QuickAdd onAdded={onAdded} />

      {loading ? (
        <p>Loading…</p>
      ) : loadError ? (
        // After a failed load the error is the whole story. "Nothing here yet"
        // would suggest the list is empty when it is just unknown.
        <p role="alert">{loadError}</p>
      ) : groups.length > 0 ? (
        groups.map((group) => (
          <StatusSection key={group.status} group={group} onChanged={onChanged} />
        ))
      ) : (
        <p>Nothing here yet.</p>
      )}
    </main>
  );
}
