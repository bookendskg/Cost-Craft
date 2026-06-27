import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChefHat, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signupSchema, type SignupValues } from "@/lib/validation/schemas";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/authError";
import { isFirebaseConfigured, firebaseAuth } from "@/lib/firebase/client";
import { firebaseSignUp, firebaseLogout } from "@/lib/firebase/auth";
import { linkFirebaseUser } from "@/lib/data";
import { toast } from "@/components/ui/use-toast";

export function SignUpPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);
    // Firebase (preferred): create the account + send a verification email, then
    // sign out so the user verifies before signing in. New users default to Viewer.
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        const fbUser = await firebaseSignUp(values.email, values.password);
        if (fbUser.email) await linkFirebaseUser(fbUser.uid, fbUser.email, values.name);
        await firebaseLogout();
        setNeedsConfirm(true);
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "Sign-up failed");
      }
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setServerError("Sign-up is not configured.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      console.error("Sign-up failed:", error);
      setServerError(authErrorMessage(error));
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
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
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
