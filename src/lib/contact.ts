// Public contact details shown on /contact and referenced by /terms. The live
// values are edited by the Super Admin (Profile Settings → Contact Page) and
// stored in system_settings under CONTACT_SETTING_KEY; these are the fallback.

export interface ContactDetails {
  email: string;
  phone: string;
  address: string;
  hours: string;
}

export const CONTACT_SETTING_KEY = "contact_details";

export const DEFAULT_CONTACT: ContactDetails = {
  email: "contact@bookends.example",
  phone: "+91 00000 00000",
  address: "Bookends Hospitality, [Street address], [City] [PIN], India",
  hours: "Monday – Saturday, 10:00 – 19:00 IST",
};

/** `tel:` link for a display phone number — keeps digits and a leading +. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
