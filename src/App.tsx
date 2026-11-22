import { useEffect, useState } from "react";
import type { Item } from "../shared/items";
import { errorMessage, listItems } from "./api";
import { NO_FILTERS, type FindOptions } from "./find";
import { withLatest } from "./groups";
import { ItemPage } from "./ItemPage";
import { ListPage } from "./ListPage";
import { Link, useRoute } from "./navigation";
import { LIST_PATH } from "./route";

/**
 * The app. It holds the list, and shows the page the address points at.
 *
 * The pages make their own requests and hand back the item the server
 * returned, which replaces the old copy here. The screen never guesses what
 * changed. The list is loaded once and kept while the person moves between
 * pages, so going back to it is instant and keeps any change made on an
 * item's page. The search and filter choices are kept here for the same
 * reason, and start fresh when the app is reloaded.
 */
export function App() {
  const route = useRoute();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [findOptions, setFindOptions] = useState<FindOptions>(NO_FILTERS);

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((e: unknown) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleAdded(item: Item) {
    setItems((current) => [item, ...current]);
  }

  function handleChanged(changed: Item) {
    setItems((current) => withLatest(current, changed));
  }

  switch (route.page) {
    case "list":
      return (
        <ListPage
          items={items}
          loading={loading}
          loadError={loadError}
          findOptions={findOptions}
          onFindChange={setFindOptions}
          onAdded={handleAdded}
          onChanged={handleChanged}
        />
      );
    case "item":
      // The key gives each item a fresh page, so nothing typed on one item's
      // page carries over to the next.
      return <ItemPage key={route.id} id={route.id} onChanged={handleChanged} />;
    case "not_found":
      return (
        <main>
          <h1>Page not found</h1>
          <p>
            <Link to={LIST_PATH}>Go to the list</Link>
          </p>
        </main>
      );
  }
}
