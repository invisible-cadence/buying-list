import { useEffect, useState } from "react";
import type { Item } from "../shared/items";
import { errorMessage, getItem, setArchived } from "./api";
import { BoughtForm } from "./BoughtForm";
import { DetailsForm } from "./DetailsForm";
import { summaryOf } from "./format";
import { STATUS_LABELS } from "./labels";
import { LinksSection } from "./LinksSection";
import { MoveSelect } from "./MoveSelect";
import { Link } from "./navigation";
import { LIST_PATH } from "./route";
import { useStatusMove } from "./useStatusMove";

type Props = {
  id: number;
  /** Called with the item as the server sent it back after any change, so the list stays current. */
  onChanged: (item: Item) => void;
};

/**
 * One item's page. It loads the item itself, so it also works when opened
 * straight from its address or after a reload.
 */
export function ItemPage({ id, onChanged }: Props) {
  const [item, setItem] = useState<Item | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // If the page changes before the answer arrives, ignore the answer.
    let current = true;
    getItem(id)
      .then((loaded) => current && setItem(loaded))
      .catch((e: unknown) => current && setLoadError(errorMessage(e)));
    return () => {
      current = false;
    };
  }, [id]);

  function handleChanged(changed: Item) {
    setItem(changed);
    onChanged(changed);
  }

  return (
    <main>
      <p>
        <Link to={LIST_PATH}>← Back to list</Link>
      </p>
      {item ? (
        <ItemDetails item={item} onChanged={handleChanged} />
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}

function ItemDetails({ item, onChanged }: { item: Item; onChanged: (item: Item) => void }) {
  const status = useStatusMove(item, onChanged);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const purchase = item.status === "bought" ? summaryOf(item) : "";

  async function archive(archived: boolean) {
    setArchiving(true);
    setArchiveError(null);
    try {
      onChanged(await setArchived(item.id, archived));
    } catch (e) {
      setArchiveError(errorMessage(e));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <h1>{item.title}</h1>

      {item.archivedAt !== null && (
        <div className="notice">
          <p>This item is archived, so it no longer shows in the list.</p>
          <button type="button" onClick={() => void archive(false)} disabled={archiving}>
            Bring it back
          </button>
        </div>
      )}

      <section className="stack">
        <div className="item">
          <div>
            <div>Status: {STATUS_LABELS[item.status]}</div>
            {purchase && <div className="details">{purchase}</div>}
          </div>
          <MoveSelect
            item={item}
            disabled={status.saving || status.buying}
            onChoose={status.choose}
          />
        </div>
        {status.buying && (
          <BoughtForm
            saving={status.saving}
            onSave={(change) => void status.move(change)}
            onCancel={status.cancelBuying}
          />
        )}
        {status.error && <p role="alert">{status.error}</p>}
      </section>

      <DetailsForm item={item} onSaved={onChanged} />
      <LinksSection item={item} onChanged={onChanged} />

      {item.archivedAt === null && (
        <section className="stack">
          <h2>Archive</h2>
          <p className="details">
            Hides the item from the list. You can bring it back from this page.
          </p>
          <div className="row">
            <button type="button" onClick={() => void archive(true)} disabled={archiving}>
              Archive
            </button>
          </div>
        </section>
      )}
      {archiveError && <p role="alert">{archiveError}</p>}
    </>
  );
}
