import { LandingHero } from "@/components/landing-hero";
import { getOptionalSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getOptionalSession();
  if (session?.user) {
    redirect("/home");
  }

  return <LandingHero />;
}
