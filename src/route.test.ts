import { describe, expect, it } from "vitest";
import { itemPath, routeFrom } from "./route";

describe("routeFrom", () => {
  it("reads the list", () => {
    expect(routeFrom("/")).toEqual({ page: "list" });
  });

  it("reads an item's page and its id", () => {
    expect(routeFrom("/items/12")).toEqual({ page: "item", id: 12 });
  });

  it("ignores a trailing slash", () => {
    expect(routeFrom("/items/12/")).toEqual({ page: "item", id: 12 });
  });

  it("reverses itemPath", () => {
    expect(routeFrom(itemPath(7))).toEqual({ page: "item", id: 7 });
  });

  it.each([
    "/items",
    "/items/",
    "/items/abc",
    "/items/-1",
    "/items/1.5",
    "/items/1/links",
    "/other",
  ])("does not recognise %j", (path) => {
    expect(routeFrom(path)).toEqual({ page: "not_found" });
  });
});
