import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The manifest and icons are only read by phones, so a mistake in them shows
// up as "cannot install", far from its cause. These checks catch the usual
// ones before a deploy: a missing file, or an icon that is not the size the
// manifest claims.

const PUBLIC = join(import.meta.dirname, "..", "public");

type Icon = { src: string; sizes: string; type: string; purpose?: string };
type Manifest = { name: string; start_url: string; display: string; icons: Icon[] };

const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8")) as Manifest;

/** Reads a PNG's width and height from its header, without an image library. */
function pngSize(path: string): string {
  const bytes = readFileSync(path);
  // Every PNG starts with the same 8 bytes, then a header chunk whose data
  // begins at byte 16 with the width and height as 4-byte numbers.
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe("the web app manifest", () => {
  it("names the app, opens on the list and runs without the browser's bars", () => {
    expect(manifest.name).toBe("Buying list");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("has the 192 and 512 pixel icons phones look for", () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it.each(manifest.icons.map((icon) => [icon.src, icon.sizes] as const))(
    "has %s, at %s as it claims",
    (src, sizes) => {
      expect(pngSize(join(PUBLIC, src))).toBe(sizes);
    },
  );

  it("has the iPhone home-screen icon at 180 pixels", () => {
    expect(pngSize(join(PUBLIC, "icons", "apple-touch-icon.png"))).toBe("180x180");
  });
});
