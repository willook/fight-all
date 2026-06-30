import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app document metadata", () => {
  it("links GLADI favicon assets in the app shell", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/apple-touch-icon.png"');

    expect(existsSync(resolve(process.cwd(), "public/favicon.ico"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "public/favicon-32x32.png"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "public/apple-touch-icon.png"))).toBe(true);
  });
});
