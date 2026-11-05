import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  INITIAL_VIEW,
  panViewport,
  zoomViewport,
  type Bounds,
  type Point,
  type Viewport,
} from "./diagramViewport";

function midpoint(points: Point[]): Point {
  return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
}

function distance(points: Point[]): number {
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

/** Viewport gestures stay independent from composition selection and reaction-line endpoints. */
export function useDiagramViewport(bounds: Bounds, onProbe: (point: null) => void) {
  const svgRef = useRef<SVGSVGElement>(null);
  const current = useRef(INITIAL_VIEW);
  const [view, setView] = useState(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const pointerFocus = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const motion = useRef(0);
  const suppressClick = useRef(false);

  const update = useCallback((next: Viewport) => {
    current.current = next;
    setView(next);
  }, []);

  const worldPoint = (client: Point): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    const viewport = current.current;
    return {
      x: viewport.x + (((client.x - rect.left) / rect.width) * bounds.width) / viewport.zoom,
      y: viewport.y + (((client.y - rect.top) / rect.height) * bounds.height) / viewport.zoom,
    };
  };

  const zoom = (factor: number, anchor?: Point, clearProbe = true) => {
    const viewport = current.current;
    update(
      zoomViewport(
        viewport,
        factor,
        anchor ?? {
          x: viewport.x + bounds.width / viewport.zoom / 2,
          y: viewport.y + bounds.height / viewport.zoom / 2,
        },
        bounds,
      ),
    );
    if (clearProbe) onProbe(null);
  };

  const reset = useCallback(
    (clearProbe = true) => {
      update(INITIAL_VIEW);
      if (clearProbe) onProbe(null);
    },
    [update, onProbe],
  );

  useEffect(() => {
    const svg = svgRef.current!;
    const wheel = (event: WheelEvent) => {
      const rect = svg.getBoundingClientRect();
      const viewport = current.current;
      const anchor = {
        x: viewport.x + (((event.clientX - rect.left) / rect.width) * bounds.width) / viewport.zoom,
        y:
          viewport.y + (((event.clientY - rect.top) / rect.height) * bounds.height) / viewport.zoom,
      };
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const factor = Math.exp(-Math.max(-200, Math.min(200, event.deltaY * unit)) * 0.005);
      const next = zoomViewport(viewport, factor, anchor, bounds);
      if (next.zoom === viewport.zoom) return;
      event.preventDefault();
      update(next);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [bounds, update]);

  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    pointerFocus.current = true;
    setKeyboardFocus(false);
    if (event.button !== 0) return;
    if (pointers.current.size === 0) {
      motion.current = 0;
      suppressClick.current = false;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size > 1) suppressClick.current = true;
  };

  /** Returns true while this move belongs to a pan or pinch, instead of a hover. */
  const pointerMove = (event: PointerEvent<SVGSVGElement>): boolean => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return false;
    const before = [...pointers.current.values()].slice(0, 2);
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    const after = [...pointers.current.values()].slice(0, 2);
    const rect = event.currentTarget.getBoundingClientRect();
    let viewport = current.current;

    if (before.length === 2) {
      const oldCenter = midpoint(before);
      const newCenter = midpoint(after);
      const oldDistance = distance(before);
      if (oldDistance > 0) {
        viewport = zoomViewport(
          viewport,
          distance(after) / oldDistance,
          worldPoint(oldCenter),
          bounds,
        );
      }
      viewport = panViewport(
        viewport,
        (-(newCenter.x - oldCenter.x) * bounds.width) / rect.width / viewport.zoom,
        (-(newCenter.y - oldCenter.y) * bounds.height) / rect.height / viewport.zoom,
        bounds,
      );
    } else {
      motion.current += Math.hypot(next.x - previous.x, next.y - previous.y);
      if (motion.current < 4) return false;
      suppressClick.current = true;
      if (viewport.zoom === 1) return false;
      viewport = panViewport(
        viewport,
        (-(next.x - previous.x) * bounds.width) / rect.width / viewport.zoom,
        (-(next.y - previous.y) * bounds.height) / rect.height / viewport.zoom,
        bounds,
      );
    }
    setDragging(true);
    update(viewport);
    onProbe(null);
    return true;
  };

  const pointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    pointerFocus.current = false;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type === "pointercancel") suppressClick.current = true;
    if (pointers.current.size === 0) setDragging(false);
  };

  const reveal = (point: Point) => {
    const viewport = current.current;
    const width = bounds.width / viewport.zoom;
    const height = bounds.height / viewport.zoom;
    const marginX = width * 0.05;
    const marginY = height * 0.05;
    const x = Math.max(point.x - width + marginX, Math.min(point.x - marginX, viewport.x));
    const y = Math.max(point.y - height + marginY, Math.min(point.y - marginY, viewport.y));
    update(panViewport(viewport, x - viewport.x, y - viewport.y, bounds));
  };

  return {
    svgRef,
    view,
    zoom,
    reset,
    reveal,
    dragging,
    keyboardFocus,
    pointerDown,
    pointerMove,
    pointerEnd,
    canSelect: () => !suppressClick.current,
    focus: () => {
      setKeyboardFocus(!pointerFocus.current);
      pointerFocus.current = false;
    },
    keyboard: () => {
      pointerFocus.current = false;
      setKeyboardFocus(true);
    },
    blur: () => {
      pointerFocus.current = false;
      setKeyboardFocus(false);
    },
  };
}
