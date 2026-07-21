import { Loader2 } from "lucide-react";

/**
 * PageLoading
 * -------------
 * Used by every loading.tsx under /campaign and /admin/campaign. Before this
 * existed, NONE of these routes had any loading.tsx at all — since they're
 * all dynamic (real server-side data fetching on every request), Next.js's
 * default behavior with no loading boundary is to keep the PREVIOUS page
 * frozen on screen until the new page's data is fully ready, then swap
 * abruptly. That's exactly the "flash of the old page" — there was no bug in
 * the data fetching, there was just no visual feedback that anything was
 * happening in between.
 */
export function PageLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />
      <Loader2 size={28} className="animate-spin text-gold" />
    </main>
  );
}
