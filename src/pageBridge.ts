export interface PageBridge {
  kind: "phase" | "voltage";
  getData(): string[] | undefined;
  getStatus(): unknown;
  getProvenance?(): import("./analysis").Provenance;
  loadSample(signal?: AbortSignal): Promise<void>;
}

let current: PageBridge | undefined;

/** Registration follows the active page lifecycle, including React StrictMode. */
export function registerPage(page: PageBridge): () => void {
  current = page;
  return () => {
    if (current === page) current = undefined;
  };
}

export function getPage(): PageBridge | undefined {
  return current;
}
