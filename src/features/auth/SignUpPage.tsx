import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChefHat, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signupSchema, type SignupValues } from "@/lib/validation/schemas";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/authError";
import { onSignIn } from "@/lib/supabase/profile";
import { useSession } from "@/lib/auth/session";
import { isPendingApproval } from "@/lib/auth/permissions";
import { toast } from "@/components/ui/use-toast";

export function SignUpPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);
    if (!isSupabaseConfigured || !supabase) {
      setServerError("Sign-up is not configured.");
      return;
    }
    // Supabase creates the auth user; a DB trigger creates the profile (Viewer,
    // pending approval). If email confirmation is OFF a session is returned and we
    // sign the user straight in (the guard routes them to the pending screen);
    // otherwise we ask them to confirm their email first.
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: (values.name || "").trim().slice(0, 100) },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      console.error("Sign-up failed:", error);
      setServerError(authErrorMessage(error));
      return;
    }
    if (data.session) {
      try {
        const user = await onSignIn();
        useSession.getState().setUser(user);
        toast.success(
          isPendingApproval(user)
            ? "Account created — awaiting admin verification."
            : "Account created — welcome!",
        );
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "Sign-up failed");
      }
    } else {
      setNeedsConfirm(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            {needsConfirm ? <MailCheck className="h-7 w-7 text-accent" /> : <ChefHat className="h-7 w-7 text-accent" />}
          </div>
          <CardTitle>{needsConfirm ? "Confirm your email" : "Create your account"}</CardTitle>
          <CardDescription>
            {needsConfirm
              ? "We've sent a confirmation link. Click it, then sign in."
              : "Sign up to start managing recipe costs."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsConfirm ? (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    {...register("confirm")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
              </div>
              {serverError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</div>
              )}
              <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
              <Link to="/login" className="block text-center text-xs text-muted-foreground hover:underline">
                Already have an account? Sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
