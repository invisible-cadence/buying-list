import type { Item } from "../shared/items";
import { FindBar } from "./FindBar";
import { findItems, type FindOptions } from "./find";
import { localToday } from "./format";
import { groupByStatus } from "./groups";
import { QuickAdd } from "./QuickAdd";
import { StatusSection } from "./StatusSection";

type Props = {
  items: Item[];
  loading: boolean;
  loadError: string | null;
  findOptions: FindOptions;
  onFindChange: (options: FindOptions) => void;
  onAdded: (item: Item) => void;
  onChanged: (item: Item) => void;
};

/** The list: quick-add, then search and filters, then one section per status. */
export function ListPage(props: Props) {
  const { items, loading, loadError, findOptions, onFindChange, onAdded, onChanged } = props;
  const shown = findItems(items, findOptions, localToday());
  // "Showing 3 of 20" counts against what would show with no filters, which
  // includes archived items only when they are being shown.
  const total = items.filter((item) => findOptions.showArchived || item.archivedAt === null).length;
  const groups = groupByStatus(shown);

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
      ) : items.length === 0 ? (
        // Only when there is truly nothing. If every item is archived, the
        // filters still show, so "Show archived" can be reached.
        <p>Nothing here yet.</p>
      ) : (
        <>
          <FindBar
            options={findOptions}
            onChange={onFindChange}
            shown={shown.length}
            total={total}
          />
          {groups.length > 0 ? (
            groups.map((group) => (
              <StatusSection key={group.status} group={group} onChanged={onChanged} />
            ))
          ) : (
            <p>Nothing matches.</p>
          )}
        </>
      )}
    </main>
  );
}
