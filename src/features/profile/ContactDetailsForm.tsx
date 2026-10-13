import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { contactDetailsSchema, type ContactDetailsValues } from "@/lib/validation/schemas";
import { useContactDetails, useSaveContactDetails } from "@/features/settings/hooks";

/**
 * Super Admin tab on Profile Settings: edits the details shown on the public
 * /contact page (and the Contact section of /terms).
 */
export function ContactDetailsForm() {
  const { data, isLoading } = useContactDetails();
  const saveMut = useSaveContactDetails();

  const form = useForm<ContactDetailsValues>({ resolver: zodResolver(contactDetailsSchema) });
  const { register, handleSubmit, reset, formState } = form;
  const { errors, isDirty } = formState;

  // Load the saved values — but never clobber edits in progress on a refetch.
  useEffect(() => {
    if (data && !form.formState.isDirty) reset(data);
  }, [data, form, reset]);

  const onSubmit = async (values: ContactDetailsValues) => {
    try {
      await saveMut.mutateAsync(values);
      reset(values);
      toast.success("Contact details saved", "The public Contact page is updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <Card className="max-w-xl p-6">
      <div className="mb-1 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-semibold">Contact Page Details</p>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Shown on the public Contact page and in the Terms &amp; Conditions. Leave a field empty to hide it.
      </p>

      {isLoading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" inputMode="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" type="tel" inputMode="tel" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-address">Office address</Label>
            <Textarea id="contact-address" rows={3} {...register("address")} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-hours">Support hours</Label>
            <Input id="contact-hours" placeholder="e.g. Monday – Saturday, 10:00 – 19:00 IST" {...register("hours")} />
            {errors.hours && <p className="text-xs text-destructive">{errors.hours.message}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" variant="accent" disabled={!isDirty || saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save details
            </Button>
            <Button asChild variant="ghost">
              <Link to="/contact" target="_blank" rel="noopener">
                <ExternalLink className="h-4 w-4" /> View contact page
              </Link>
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
