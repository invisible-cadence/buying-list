import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { Bindings } from "./env";
import { MAX_TITLE_LENGTH, parseTitle } from "./items";

describe("parseTitle", () => {
  it("accepts a title and trims the spaces around it", () => {
    expect(parseTitle({ title: "  Kettle  " })).toEqual({ title: "Kettle" });
  });

  it("rejects a missing, empty or blank title", () => {
    expect(parseTitle({})).toHaveProperty("error");
    expect(parseTitle({ title: "" })).toHaveProperty("error");
    expect(parseTitle({ title: "   " })).toHaveProperty("error");
  });

  it("rejects a title that is not text", () => {
    expect(parseTitle({ title: 42 })).toHaveProperty("error");
    expect(parseTitle(null)).toHaveProperty("error");
    expect(parseTitle("Kettle")).toHaveProperty("error");
  });

  it("accepts the longest allowed title and rejects one character more", () => {
    expect(parseTitle({ title: "a".repeat(MAX_TITLE_LENGTH) })).toHaveProperty("title");
    expect(parseTitle({ title: "a".repeat(MAX_TITLE_LENGTH + 1) })).toHaveProperty("error");
  });
});

describe("POST /api/items", () => {
  // These requests are refused before the database is used, so an empty
  // stand-in is enough. The sign-in check is switched off for localhost.
  const env = { DEV_SKIP_ACCESS: "true" } as Bindings;
  const app = createApp();

  function post(body: string, contentType = "application/json") {
    return app.request(
      "http://localhost/api/items",
      { method: "POST", headers: { "Content-Type": contentType }, body },
      env,
    );
  }

  it("refuses a body that is not JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("refuses a request that does not say it is JSON", async () => {
    expect((await post('{"title":"Kettle"}', "text/plain")).status).toBe(415);
  });

  it("accepts the content type in any letter case", async () => {
    // Valid type, invalid body: the answer is 400 (bad body), not 415 (bad type).
    expect((await post("not json", "Application/JSON; charset=utf-8")).status).toBe(400);
  });

  it("refuses an empty title", async () => {
    const response = await post('{"title":"  "}');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "A title is required." });
  });
});

describe("unknown API paths", () => {
  it("answer with a JSON error, not the front end", async () => {
    const env = { DEV_SKIP_ACCESS: "true" } as Bindings;
    const response = await createApp().request("http://localhost/api/nothing", {}, env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found." });
  });
});
