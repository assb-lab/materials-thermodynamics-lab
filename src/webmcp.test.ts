import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getPage, registerPage } from "./pageBridge";
import { registerWebMcp, type ModelContext } from "./webmcp";

vi.mock("./router", () => ({
  router: { state: { location: { pathname: "/" } }, navigate: vi.fn() },
}));

afterEach(() => vi.unstubAllGlobals());

describe("WebMCP lifecycle and scientific tools", () => {
  it("registers once and releases registrations using the browser AbortSignal contract", () => {
    const registrations: Parameters<ModelContext["registerTool"]>[] = [];
    const cleanup = registerWebMcp({
      registerTool: (...args) => {
        registrations.push(args);
      },
    });
    expect(registrations).toHaveLength(5);
    expect(new Set(registrations.map(([tool]) => tool.name)).size).toBe(5);
    for (const [, { signal }] of registrations) expect(signal.aborted).toBe(false);
    cleanup();
    for (const [, { signal }] of registrations) expect(signal.aborted).toBe(true);
  });

  it("uses currently mounted page data and preserves data-source errors", async () => {
    const tools = new Map<string, Parameters<ModelContext["registerTool"]>[0]>();
    const cleanup = registerWebMcp({
      registerTool: (tool) => {
        tools.set(tool.name, tool);
      },
    });
    const sample = await import("./sample/Cl-Li-P-S_GGA_GGA+U_R2SCAN.json");
    const unregister = registerPage({
      kind: "phase",
      getData: () => [JSON.stringify(sample.default)],
      getStatus: () => ({ entries: 108 }),
      loadSample: async () => {},
    });
    try {
      const tool = tools.get("materials_analyze")!;
      const output = (await tool.execute({ command: "profile", formula: "Li6PS5Cl" })) as {
        energyBasis: string;
        result: { regions: unknown[] };
      };
      expect(output.energyBasis).toBe("formation");
      expect(output.result.regions.length).toBeGreaterThan(2);
      await expect(
        tool.execute({ command: "profile", formula: "Li6PS5Cl", ion: "Xe" }),
      ).rejects.toThrow();
      const abort = new AbortController();
      abort.abort();
      await expect(
        tool.execute({ command: "section", sample: true }, { signal: abort.signal }),
      ).rejects.toThrow();
    } finally {
      unregister();
      cleanup();
    }
    expect(getPage()).toBeUndefined();
    await expect(tools.get("materials_analyze")!.execute({ command: "section" })).rejects.toThrow(
      /data/,
    );
  });

  it("tolerates unsupported browsers and registration rejection", async () => {
    vi.stubGlobal("document", {});
    expect(registerWebMcp()).toBeTypeOf("function");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cleanup = registerWebMcp({
      registerTool: () => Promise.reject(new Error("Unavailable")),
    });
    await Promise.resolve();
    expect(warning).toHaveBeenCalledTimes(5);
    cleanup();
    warning.mockRestore();
  });
});
