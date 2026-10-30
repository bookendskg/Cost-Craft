import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { usePageMeta } from "@/lib/usePageMeta";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { phoneHref } from "@/lib/contact";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactDetails } from "@/features/settings/hooks";
import { PublicPage } from "./PublicPage";
import { FeatureCard, SectionHeading } from "./parts";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

export function ContactPage() {
  usePageMeta({
    title: "Contact · Kost Kraft",
    description: "Contact the Bookends AI Team for Kost Kraft support, access requests and feedback.",
  });
  // Edited by the Super Admin in Profile Settings → Contact Page.
  const { data: contact, isLoading } = useContactDetails();

  return (
    <PublicPage>
      <SectionHeading
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about Kost Kraft, help with your account, or feedback on the platform — reach the Bookends AI Team here."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {isLoading || !contact ? (
          // Skeletons rather than the defaults, so visitors never see placeholder details flash.
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="mt-5 h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-48" />
            </div>
          ))
        ) : (
          // Empty fields are hidden — the Super Admin clears a field to remove its card.
          <>
            {contact.email && (
              <FeatureCard icon={Mail} title="Email">
                <a href={`mailto:${contact.email}`} className={linkClass}>
                  {contact.email}
                </a>
              </FeatureCard>
            )}
            {contact.phone && (
              <FeatureCard icon={Phone} title="Phone">
                <a href={phoneHref(contact.phone)} className={linkClass}>
                  {contact.phone}
                </a>
              </FeatureCard>
            )}
            {contact.address && (
              <FeatureCard icon={MapPin} title="Office">
                <span className="whitespace-pre-line">{contact.address}</span>
              </FeatureCard>
            )}
            {contact.hours && (
              <FeatureCard icon={Clock} title="Support hours">
                {contact.hours}
              </FeatureCard>
            )}
          </>
        )}
      </div>

      {isSupabaseConfigured && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Need an account? An administrator creates it for you — use the form above and
          we&apos;ll set one up.
        </p>
      )}
    </PublicPage>
  );
}
