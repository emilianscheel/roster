import { SignInForm } from "@/components/sign-in-form";
import { getOptionalSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  // Only bounce away when the session is actually valid — never trust a bare cookie.
  const session = await getOptionalSession();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignInForm />
    </main>
  );
}
