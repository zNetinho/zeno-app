import {
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider
} from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { Header } from "./components/header.tsx";
import GastosPage from "./routes/gastos.tsx";
import HomePage from "./routes/home.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";

const rootRoute = createRootRoute({
  component: () => {
    return (
      <>
        <Header />
        <main>
          <Outlet />
        </main>
      </>
    );
  },
});

const routeTree = rootRoute.addChildren([
  HomePage(rootRoute),
  GastosPage(rootRoute),
]);

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>,
  );
}
