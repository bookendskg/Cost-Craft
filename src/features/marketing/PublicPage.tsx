import { useEffect, type ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

/**
 * On mount, jump to the URL's #section if there is one, else to the top. The
 * router has no ScrollRestoration, so without this a link followed from the
 * bottom of one public page would open the next already scrolled down, and
 * cross-page links like "/#features" would land at the top.
 */
export function useInitialScroll() {
  useEffect(() => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, []);
}

/**
 * Shell for secondary public pages (Contact, Terms) — same header, footer and
 * cream background as the landing page, with a narrow reading column.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  useInitialScroll();

  return (
    <div className="min-h-[100dvh] bg-[#faf8f3]">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">{children}</main>
      <PublicFooter />
    </div>
  );
}
