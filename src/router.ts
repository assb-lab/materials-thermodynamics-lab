import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { AppShell, NotFound } from "./AppShell";

const rootRoute = createRootRoute({ component: AppShell, notFoundComponent: NotFound });
const phaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./App")),
});
const voltageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reaction-voltage",
  component: lazyRouteComponent(() => import("./voltage/VoltagePage")),
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([phaseRoute, voltageRoute]),
  history: createHashHistory(),
  defaultPreload: "intent",
  defaultViewTransition: {
    types: ({ pathChanged }) =>
      pathChanged && !matchMedia("(prefers-reduced-motion: reduce)").matches
        ? ["tool-switch"]
        : false,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
