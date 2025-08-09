import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/components/providers/auth-context-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useDrawing } from "@/features/drawings/hooks";
import { createPage } from "@/features/pages/api";
import { usePages } from "@/features/pages/hooks";

export default function DrawingResolverPage() {
  const { drawingId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const drawingQuery = useDrawing(drawingId);
  const pagesQuery = usePages(drawingId);
  const creating = useRef(false);

  useEffect(() => {
    if (!drawingQuery.data || !pagesQuery.data || !user) return;
    if (drawingQuery.data.isDeleted) return;
    if (creating.current) return;

    const pages = pagesQuery.data;
    const target =
      pages.find((page) => page.id === drawingQuery.data?.lastPageId) ??
      pages[0];

    if (target) {
      navigate(`/d/${drawingId}/p/${target.id}`, { replace: true });
      return;
    }

    creating.current = true;
    void createPage({
      drawingId,
      uid: user.uid,
      order: "a0",
      name: "Page 1",
    })
      .then((pageId) => {
        navigate(`/d/${drawingId}/p/${pageId}`, { replace: true });
      })
      .catch(() => {
        creating.current = false;
      });
  }, [drawingId, drawingQuery.data, navigate, pagesQuery.data, user]);

  if (drawingQuery.data?.isDeleted) {
    return <Navigate to="/trash" replace />;
  }

  if (drawingQuery.isLoading || pagesQuery.isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Opening drawing…
      </div>
    );
  }

  if (!drawingQuery.data) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-6">
        <EmptyState
          icon={Loader2}
          title="Drawing not found"
          description="It may have been deleted, or you don't have access to it."
          action={
            <Button asChild>
              <Link to="/">Back to drawings</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Preparing your page…
    </div>
  );
}
