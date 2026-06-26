import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/schemas";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/authError";
import { toast } from "@/components/ui/use-toast";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  // detectSessionInUrl consumes the recovery token; confirm a session exists.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null);
    if (!supabase) {
      setServerError("Supabase is not configured.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      console.error("Password update failed:", error);
      setServerError(authErrorMessage(error));
      return;
    }
    await supabase.auth.signOut();
    toast.success("Password updated", "Please sign in with your new password.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <ChefHat className="h-7 w-7 text-accent" />
          </div>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
              </div>
              {serverError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</div>
              )}
              <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting || hasSession === null}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
