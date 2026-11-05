import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function mockStorage(initial: [string, string][] = []) {
  const entries = new Map(initial);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  return entries;
}

describe("shared Materials Project key", () => {
  it("keeps the key available in memory without saving it until requested", async () => {
    const disk = mockStorage();
    const { getApiKeySettings, setApiKeySettings, KEYS } = await import("./storage");
    expect(getApiKeySettings()).toEqual({ key: "", remember: false });

    setApiKeySettings({ key: "fixture-key", remember: false });
    expect(getApiKeySettings().key).toBe("fixture-key");
    expect(disk.has(KEYS.apiKey)).toBe(false);

    setApiKeySettings({ key: "fixture-key", remember: true });
    expect(disk.get(KEYS.apiKey)).toBe("fixture-key");

    setApiKeySettings({ key: "fixture-key", remember: false });
    expect(disk.has(KEYS.apiKey)).toBe(false);
    expect(getApiKeySettings().key).toBe("fixture-key");
  });

  it("restores a saved legacy key and clears it on opt-out", async () => {
    const disk = mockStorage([["rvc.mpApiKey", "legacy-fixture"]]);
    const { getApiKeySettings, setApiKeySettings, KEYS } = await import("./storage");
    expect(getApiKeySettings()).toEqual({ key: "legacy-fixture", remember: true });

    setApiKeySettings({ key: "legacy-fixture", remember: false });
    expect(disk.has("rvc.mpApiKey")).toBe(false);
    expect(disk.has(KEYS.apiKey)).toBe(false);
  });
});
