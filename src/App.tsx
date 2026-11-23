import { useEffect, useState } from "react";
import type { Item } from "../shared/items";
import { errorMessage, getMe, listItems } from "./api";
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
  // Who is signed in. Only used to say "you" and to show the private tick box
  // on items this person added. The server enforces the rules either way.
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((e: unknown) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
    // If this fails, the screen just does not offer the private tick box on
    // existing items, so there is nothing more to show.
    getMe()
      .then(setViewer)
      .catch((e: unknown) => console.error("Could not read who is signed in:", e));
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
      return <ItemPage key={route.id} id={route.id} viewer={viewer} onChanged={handleChanged} />;
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
