import { ANALYSIS_SCHEMA } from "./analysisInput";
import { getLang, LANGS, setLang, type Lang } from "./i18n";
import { getPage } from "./pageBridge";
import { router } from "./router";
import { applyTheme, loadTheme, THEMES, type Theme } from "./theme";
import { KEYS, save } from "./storage";

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<unknown>;
}
export interface ModelContext {
  registerTool(tool: Tool, options: { signal: AbortSignal }): Promise<void> | void;
}

export function registerWebMcp(
  context = (document as Document & { modelContext?: ModelContext }).modelContext,
): () => void {
  if (!context?.registerTool) return () => {};
  const controller = new AbortController();
  const tools: Tool[] = [
    {
      name: "materials_status",
      description:
        "Read the active thermodynamics page, language, theme, data source and computed summary. No API keys are returned.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => ({
        route: router.state.location.pathname,
        language: getLang(),
        theme: loadTheme(),
        page: getPage()?.getStatus() ?? null,
      }),
    },
    {
      name: "materials_analyze",
      description:
        "Calculate a pseudo-ternary section, decomposition at coordinates, reaction line, or voltage profile with optional volume/film. Uses explicit JSON texts, the bundled real MP sample, or data loaded in the active page. Returns structured scientific data and provenance, without changing the plotted result.",
      inputSchema: ANALYSIS_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted();
        const page = getPage();
        const usePage = input.data === undefined && input.sample !== true;
        const request = usePage ? { ...input, data: page?.getData() } : input;
        const provenance = usePage ? page?.getProvenance?.() : undefined;
        const { runAnalysis } = await import("./analysis");
        options?.signal?.throwIfAborted();
        const result = await runAnalysis(request, "json", provenance);
        options?.signal?.throwIfAborted();
        return result;
      },
    },
    {
      name: "materials_load_sample",
      description:
        "Load and plot the bundled real Materials Project Cl-Li-P-S sample in the active page.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: async (_input, options) => {
        options?.signal?.throwIfAborted();
        const page = getPage();
        if (!page) throw new Error("The page is still loading. Try again.");
        await page.loadSample(options?.signal);
        options?.signal?.throwIfAborted();
        if (getPage()?.kind !== page.kind)
          throw new DOMException("The active page changed.", "AbortError");
        return { loaded: true, page: page.kind };
      },
    },
    {
      name: "materials_navigate",
      description: "Open the pseudo-ternary phase diagram or reaction voltage calculator.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["page"],
        properties: { page: { type: "string", enum: ["phase", "voltage"] } },
      },
      annotations: { readOnlyHint: false },
      execute: async (input, options) => {
        if (input.page !== "phase" && input.page !== "voltage") throw new Error("Unknown page.");
        options?.signal?.throwIfAborted();
        await router.navigate({ to: input.page === "phase" ? "/" : "/reaction-voltage" });
        return { page: input.page };
      },
    },
    {
      name: "materials_preferences",
      description:
        "Set display language and/or theme using the same preferences as the shared app header.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          language: { type: "string", enum: LANGS },
          theme: { type: "string", enum: THEMES },
        },
      },
      annotations: { readOnlyHint: false },
      execute: async (input, options) => {
        if (input.language !== undefined && !LANGS.includes(input.language as Lang))
          throw new Error("Unsupported language.");
        if (input.theme !== undefined && !THEMES.includes(input.theme as Theme))
          throw new Error("Unsupported theme.");
        options?.signal?.throwIfAborted();
        if (input.language !== undefined) setLang(input.language as Lang);
        if (input.theme !== undefined) {
          save(KEYS.theme, input.theme as Theme);
          applyTheme(input.theme as Theme);
          // Header theme state listens for this app-level preference event.
          window.dispatchEvent(new Event("materials-theme-change"));
        }
        return { language: getLang(), theme: loadTheme() };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
        (error: unknown) => {
          if (!controller.signal.aborted)
            console.warn(`WebMCP registration failed for ${tool.name}`, error);
        },
      );
    } catch (error) {
      if (!controller.signal.aborted)
        console.warn(`WebMCP registration failed for ${tool.name}`, error);
    }
  }
  return () => controller.abort();
}
