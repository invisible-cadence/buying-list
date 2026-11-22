import { useId, useState, type FormEvent } from "react";
import { MAX_LABEL_LENGTH, MAX_URL_LENGTH, type Item } from "../shared/items";
import { addLink, errorMessage, removeLink } from "./api";

type Props = {
  item: Item;
  /** Called with the item as the server sent it back after a change. */
  onChanged: (item: Item) => void;
};

/** The item's links: open one, remove one, or add a new one. */
export function LinksSection({ item, onChanged }: Props) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  /** Runs one request, keeping "saving" and the error message in step. */
  async function run(request: () => Promise<Item>): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      onChanged(await request());
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (url.trim() === "") return;
    const link =
      label.trim() === "" ? { url: url.trim() } : { url: url.trim(), label: label.trim() };
    if (await run(() => addLink(item.id, link))) {
      setUrl("");
      setLabel("");
    }
  }

  return (
    <section className="stack">
      <h2>Links</h2>
      {item.links.length > 0 ? (
        <ul className="items">
          {item.links.map((link) => (
            <li key={link.id} className="item">
              {/* noopener stops the shop's page from reaching back into this app. */}
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="link">
                {link.label || link.url}
              </a>
              <button
                type="button"
                onClick={() => void run(() => removeLink(item.id, link.id))}
                disabled={saving}
                aria-label={`Remove link ${link.label || link.url}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No links yet.</p>
      )}

      {/* noValidate: the API checks the address and explains any problem in a plain sentence. */}
      <form className="stack" onSubmit={(event) => void handleAdd(event)} noValidate>
        <label htmlFor={`${id}-url`}>Add a link</label>
        <input
          id={`${id}-url`}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={MAX_URL_LENGTH}
          placeholder="https://"
          autoComplete="off"
        />
        <label htmlFor={`${id}-label`}>Label (optional)</label>
        <input
          id={`${id}-label`}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={MAX_LABEL_LENGTH}
          autoComplete="off"
        />
        {error && <p role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={saving || url.trim() === ""}>
            Add link
          </button>
        </div>
      </form>
    </section>
  );
}
