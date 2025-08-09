import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The page you were looking for moved, was deleted, or never existed.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to drawings</Link>
      </Button>
    </div>
  );
}
