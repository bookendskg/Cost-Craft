import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChefHat, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/schemas";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/authError";
import { isFirebaseConfigured, firebaseAuth } from "@/lib/firebase/client";
import { firebaseResetPassword } from "@/lib/firebase/auth";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null);
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await firebaseResetPassword(values.email);
        setSent(true);
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "Password reset failed");
      }
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setServerError("Password reset is not configured. Contact your admin.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("Password reset failed:", error);
      setServerError(authErrorMessage(error));
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            {sent ? <MailCheck className="h-7 w-7 text-accent" /> : <ChefHat className="h-7 w-7 text-accent" />}
          </div>
          <CardTitle>{sent ? "Check your email" : "Reset your password"}</CardTitle>
          <CardDescription>
            {sent
              ? "If an account exists for that address, we've sent a reset link."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              {serverError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</div>
              )}
              <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
              <Link to="/login" className="block text-center text-xs text-muted-foreground hover:underline">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
