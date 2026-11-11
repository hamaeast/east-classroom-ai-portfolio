import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { SCHOOL_NAME, SCHOOL_EMAIL_DOMAIN } from '@/lib/schoolConfig';

export default function Login() {
  const domainError = new URLSearchParams(window.location.search).get("error") === "domain";
  const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/";

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title={`${SCHOOL_NAME} sign in`}
      subtitle={SCHOOL_EMAIL_DOMAIN ? `Use your @${SCHOOL_EMAIL_DOMAIN} Google account to continue.` : "Use your school Google account to continue."}
    >
      {domainError && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Access is limited to {SCHOOL_EMAIL_DOMAIN ? `@${SCHOOL_EMAIL_DOMAIN}` : "school"} Google accounts.
        </div>
      )}
      <Button variant="outline" className="h-12 w-full text-sm font-medium" onClick={handleGoogle}>
        <GoogleIcon className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">Accounts cannot be created from this page.</p>
    </AuthLayout>
  );
}