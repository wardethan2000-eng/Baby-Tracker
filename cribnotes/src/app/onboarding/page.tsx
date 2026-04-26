import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, onboardingDone: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingDone) {
    redirect("/");
  }

  return <OnboardingFlow userName={user.name || session.user.name || "there"} />;
}
