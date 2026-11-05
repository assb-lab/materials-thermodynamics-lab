export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Bounds {
  width: number;
  height: number;
}

export const INITIAL_VIEW: Viewport = { x: 0, y: 0, zoom: 1 };
export const MAX_ZOOM = 8;

function constrain(view: Viewport, bounds: Bounds): Viewport {
  return {
    ...view,
    x: Math.max(0, Math.min(bounds.width * (1 - 1 / view.zoom), view.x)),
    y: Math.max(0, Math.min(bounds.height * (1 - 1 / view.zoom), view.y)),
  };
}

/** Keep the world point under the pointer fixed, except at the full-view boundary. */
export function zoomViewport(
  view: Viewport,
  factor: number,
  anchor: Point,
  bounds: Bounds,
): Viewport {
  const requested = Math.max(1, Math.min(MAX_ZOOM, view.zoom * factor));
  const zoom = Math.abs(requested - 1) < 1e-6 ? 1 : requested;
  const ratio = view.zoom / zoom;
  return constrain(
    {
      zoom,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
    },
    bounds,
  );
}

export function panViewport(view: Viewport, dx: number, dy: number, bounds: Bounds): Viewport {
  return constrain({ ...view, x: view.x + dx, y: view.y + dy }, bounds);
}
