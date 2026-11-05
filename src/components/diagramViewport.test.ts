import { describe, expect, it } from "vite-plus/test";
import { INITIAL_VIEW, MAX_ZOOM, panViewport, zoomViewport } from "./diagramViewport";

const bounds = { width: 700, height: 600 };

describe("phase diagram viewport", () => {
  it("snaps floating-point drift back to the full view", () => {
    expect(
      zoomViewport({ x: 0, y: 0, zoom: 1 + Number.EPSILON }, 1, { x: 350, y: 300 }, bounds),
    ).toEqual(INITIAL_VIEW);
  });

  it("keeps an interior composition under the same screen position during zoom", () => {
    const anchor = { x: 300, y: 280 };
    const view = { x: 50, y: 60, zoom: 2 };
    const next = zoomViewport(view, 1.5, anchor, bounds);
    expect((anchor.x - next.x) * next.zoom).toBeCloseTo((anchor.x - view.x) * view.zoom);
    expect((anchor.y - next.y) * next.zoom).toBeCloseTo((anchor.y - view.y) * view.zoom);
  });

  it("returns exactly to the full diagram and prevents panning it out of sight", () => {
    expect(zoomViewport({ x: 200, y: 100, zoom: 3 }, 0.1, { x: 300, y: 250 }, bounds)).toEqual(
      INITIAL_VIEW,
    );
    expect(panViewport(INITIAL_VIEW, 50, -50, bounds)).toEqual(INITIAL_VIEW);
  });

  it("limits magnification and constrains drags to the original drawing", () => {
    const view = zoomViewport(INITIAL_VIEW, 100, { x: 350, y: 300 }, bounds);
    expect(view.zoom).toBe(MAX_ZOOM);
    expect(panViewport(view, -1000, -1000, bounds)).toEqual({ x: 0, y: 0, zoom: MAX_ZOOM });
    expect(panViewport(view, 1000, 1000, bounds)).toEqual({
      x: 700 * (1 - 1 / MAX_ZOOM),
      y: 600 * (1 - 1 / MAX_ZOOM),
      zoom: MAX_ZOOM,
    });
  });

  it("preserves an edge anchor until the drawing boundary is reached", () => {
    const view = zoomViewport(INITIAL_VIEW, 2, { x: 0, y: 0 }, bounds);
    expect(view).toEqual({ x: 0, y: 0, zoom: 2 });
    const bottomRight = zoomViewport(INITIAL_VIEW, 2, { x: 700, y: 600 }, bounds);
    expect(bottomRight).toEqual({ x: 350, y: 300, zoom: 2 });
  });
});
