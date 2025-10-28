import { ReactNode, useEffect, useState } from "react";

interface RemoteImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
  loading?: "lazy" | "eager";
}

/**
 * An <img> that never leaves a broken icon behind. Firebase Storage can answer
 * image downloads with 402/404 (quota, missing object), in which case we show
 * the caller's placeholder instead.
 */
export function RemoteImage({
  src,
  alt = "",
  className,
  fallback,
  loading = "lazy",
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      draggable={false}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
