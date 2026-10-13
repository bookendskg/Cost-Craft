import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/lib/usePageMeta";
import { useContactDetails } from "@/features/settings/hooks";
import { PublicPage } from "./PublicPage";
import { SectionHeading } from "./parts";

// DRAFT for legal review — standard terms for an internal, invite-only business
// tool. Have counsel confirm the wording, fill in the [City] placeholder under
// "Governing law", and bump LAST_UPDATED whenever the text changes.
const LAST_UPDATED = "13 October 2026";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

/** Contact section body — reads the Super Admin-managed email; omitted when none is set. */
function TermsContactBody() {
  const { data: contact } = useContactDetails();
  return (
    <p>
      Questions about these terms? Visit our <Link to="/contact" className={linkClass}>Contact page</Link>
      {contact?.email ? (
        <>
          {" "}or email <a href={`mailto:${contact.email}`} className={linkClass}>{contact.email}</a>
        </>
      ) : null}
      .
    </p>
  );
}

const SECTIONS: { id: string; heading: string; body: ReactNode }[] = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: (
      <p>
        These Terms &amp; Conditions govern your access to and use of Kost Kraft, the recipe costing, yield and
        wastage platform operated by Bookends Hospitality (&ldquo;Bookends&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By signing in to or otherwise using Kost Kraft — including opening a shared recipe
        link — you agree to these terms. If you do not agree, do not use the platform.
      </p>
    ),
  },
  {
    id: "eligibility",
    heading: "Who may use Kost Kraft",
    body: (
      <>
        <p>
          Kost Kraft is an internal business tool. It is available only to employees, consultants and partners of
          Bookends Hospitality and its brands, including Capiche and Aiko, who have been granted access.
        </p>
        <p>
          New accounts must be approved by an administrator. Your role, permissions and brand or outlet scope are
          set by Bookends and may be changed at any time.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Accounts & security",
    body: (
      <>
        <p>
          You are responsible for keeping your login credentials confidential and for all activity under your
          account. Do not share your account or password with anyone.
        </p>
        <p>
          Tell your administrator, or <Link to="/contact" className={linkClass}>contact us</Link>, immediately if
          you suspect unauthorised use of your account.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <p>Use Kost Kraft only for legitimate Bookends business and within your assigned role. You must not:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>access, or attempt to access, data, features, brands or outlets outside your permissions;</li>
          <li>
            copy, scrape, export or distribute data other than through the platform&rsquo;s built-in export and
            sharing features, for Bookends business;
          </li>
          <li>reverse engineer, disrupt, or attempt to bypass the platform&rsquo;s security or access controls;</li>
          <li>enter unlawful, harmful or deliberately misleading content.</li>
        </ul>
      </>
    ),
  },
  {
    id: "confidentiality",
    heading: "Confidential information",
    body: (
      <>
        <p>
          Recipes, methods, costings, yields, supplier prices, selling prices and all other brand and outlet data in
          Kost Kraft are confidential information and trade secrets of Bookends Hospitality.
        </p>
        <p>
          You must not disclose this information outside Bookends, or use it for anything other than your work for
          Bookends, during or after your engagement. This applies equally to recipes received through a shared link:
          they are for the recipient&rsquo;s use only and must not be forwarded or republished.
        </p>
      </>
    ),
  },
  {
    id: "data",
    heading: "Data ownership & accuracy",
    body: (
      <>
        <p>All recipes, data, reports and other content created in Kost Kraft belong to Bookends Hospitality.</p>
        <p>
          Costings, yields and margins are calculated from the prices and quantities entered into the platform and
          are estimates. Bookends does not guarantee their accuracy — check important figures before relying on
          them for pricing or purchasing decisions.
        </p>
      </>
    ),
  },
  {
    id: "activity-logging",
    heading: "Activity logging",
    body: (
      <p>
        To protect our data and keep a reliable audit trail, Kost Kraft records account activity — such as sign-ins,
        edits, approvals, exports and shared-link access — along with who performed each action and when. These
        records may be reviewed by authorised administrators.
      </p>
    ),
  },
  {
    id: "availability",
    heading: "Availability & changes to the service",
    body: (
      <p>
        We aim to keep Kost Kraft available and accurate but do not guarantee uninterrupted or error-free operation.
        We may update, change, suspend or discontinue any part of the platform at any time, including for
        maintenance.
      </p>
    ),
  },
  {
    id: "termination",
    heading: "Suspension & termination",
    body: (
      <p>
        Bookends may suspend or revoke your access at any time — for example when your role changes, your
        engagement with Bookends ends, or you breach these terms. Your confidentiality obligations continue after
        your access ends.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <p>
        Kost Kraft is provided &ldquo;as is&rdquo; for internal business use. To the fullest extent permitted by
        law, Bookends Hospitality is not liable for any indirect, incidental or consequential loss, or for any loss
        arising from reliance on figures produced by the platform.
      </p>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of India. The courts at [City] have exclusive jurisdiction over any
        dispute arising from them.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time; the &ldquo;Last updated&rdquo; date above shows when they last
        changed. Continuing to use Kost Kraft after a change means you accept the updated terms.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: <TermsContactBody />,
  },
];

export function TermsPage() {
  usePageMeta({
    title: "Terms & Conditions · Kost Kraft",
    description: "The terms that govern access to and use of Kost Kraft, Bookends Hospitality's recipe costing platform.",
  });

  return (
    <PublicPage>
      <SectionHeading
        as="h1"
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Please read these terms carefully before using Kost Kraft."
      />
      <p className="mt-4 text-center text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <nav aria-label="Contents" className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Contents</p>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                {i + 1}. {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((s, i) => (
          // scroll-mt clears the sticky header when jumping from the contents list.
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="font-display text-xl font-medium text-foreground">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/80">{s.body}</div>
          </section>
        ))}
      </div>
    </PublicPage>
  );
}
