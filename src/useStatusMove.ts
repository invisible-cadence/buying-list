import { useState } from "react";
import type { Item, Status } from "../shared/items";
import { changeStatus, errorMessage, type StatusChange } from "./api";

/**
 * The behaviour behind the Move to menu, shared by the list row and the item
 * page, which lay it out differently. Picking "bought" opens the bought form
 * first; any other status is sent at once.
 *
 * @param onChanged Called with the item as the server sent it back.
 */
export function useStatusMove(item: Item, onChanged: (item: Item) => void) {
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

  function choose(to: Status) {
    if (to === "bought") {
      setBuying(true);
    } else {
      void move({ status: to });
    }
  }

  function cancelBuying() {
    setBuying(false);
    setError(null);
  }

  return { buying, saving, error, choose, move, cancelBuying };
}
