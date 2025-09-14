import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/app/layouts/app-shell";
import { PublicOnly } from "@/app/guards/public-only";
import { RequireAuth } from "@/app/guards/require-auth";
import { RouteError } from "@/app/route-error";
import DashboardPage from "@/routes/dashboard";
import DrawingResolverPage from "@/routes/drawing-resolver";
import EditorPage from "@/routes/editor";
import LoginPage from "@/routes/login";
import NotFoundPage from "@/routes/not-found";
import SettingsPage from "@/routes/settings";
import TrashPage from "@/routes/trash";

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicOnly />,
        children: [{ path: "/login", element: <LoginPage /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "trash", element: <TrashPage /> },
              { path: "settings", element: <SettingsPage /> },
            ],
          },
          { path: "d/:drawingId", element: <DrawingResolverPage /> },
          { path: "d/:drawingId/p/:pageId", element: <EditorPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
