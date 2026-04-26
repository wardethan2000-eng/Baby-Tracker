import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/Header";
import { ChildSelector } from "@/components/shared/ChildSelector";
import { BottomNav } from "@/components/shared/BottomNav";
import { PwaBanner } from "@/components/shared/PwaBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingDone) {
    redirect("/onboarding");
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-base flex flex-col">
      <Header />
      <ChildSelector />
      <PwaBanner />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
