import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { routeFrom, type Route } from "./route";

// Moving between pages without reloading the app. The browser keeps a history
// of addresses; pushing a new one changes the address bar and lets the back
// button work, and the "popstate" event says when the person went back or
// forward. This small file is all the routing two pages need.

const NAVIGATED = "app:navigated";

/** Goes to another page of the app, adding it to the browser's history. */
export function navigate(path: string) {
  window.history.pushState(null, "", path);
  // pushState does not tell anyone the address changed, so say so.
  window.dispatchEvent(new Event(NAVIGATED));
  window.scrollTo(0, 0);
}

/** The page the address bar points at, kept up to date as it changes. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => routeFrom(window.location.pathname));

  useEffect(() => {
    const update = () => setRoute(routeFrom(window.location.pathname));
    window.addEventListener("popstate", update);
    window.addEventListener(NAVIGATED, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAVIGATED, update);
    };
  }, []);

  return route;
}

/**
 * A link to another page of the app. It is a real link, so it can still be
 * opened in a new tab, but a plain tap changes page without a reload.
 */
export function Link({ to, children }: { to: string; children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Leave a tap with a modifier key, such as Ctrl for a new tab, to the browser.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick}>
      {children}
    </a>
  );
}
