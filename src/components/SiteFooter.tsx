import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Site-wide footer (copyright, developer credit, Contact / Terms links), shared
 * by every screen: the app shell, landing page, auth pages and public share
 * links. One centred line that wraps onto more when the container is narrow
 * (mobile, the login column). `onBrand` switches to white text for
 * brand-colour backgrounds.
 */
export function SiteFooter({ className, onBrand }: { className?: string; onBrand?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-xs",
        onBrand ? "text-white/80 drop-shadow-sm" : "text-muted-foreground",
        className,
      )}
    >
      <span>© {year} Kost Kraft · Bookends Hospitality. All rights reserved.</span>
      <span>Designed &amp; developed in-house by the Bookends AI Team</span>
      {/* No colour classes: links inherit the footer tone (muted, dark mode, onBrand). */}
      <nav aria-label="Legal" className="flex items-center gap-2">
        <Link to="/contact" className="underline-offset-4 hover:underline">
          Contact
        </Link>
        <span aria-hidden>·</span>
        <Link to="/terms" className="underline-offset-4 hover:underline">
          Terms &amp; Conditions
        </Link>
      </nav>
    </footer>
  );
}
