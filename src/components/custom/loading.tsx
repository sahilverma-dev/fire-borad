import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background text-muted-foreground">
      <div className="flex items-center gap-3 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading Fireboard…
      </div>
    </div>
  );
};

export default Loading;
