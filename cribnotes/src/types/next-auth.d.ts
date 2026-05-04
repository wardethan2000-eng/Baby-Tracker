import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    onboardingDone?: boolean;
    designation?: "PARENT" | "CARETAKER" | "BABYSITTER";
    paidAt?: string | null;
    trialEndsAt?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      onboardingDone?: boolean;
      designation?: "PARENT" | "CARETAKER" | "BABYSITTER";
      paidAt?: string | null;
      trialEndsAt?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingDone?: boolean;
    designation?: "PARENT" | "CARETAKER" | "BABYSITTER";
    paidAt?: string | null;
    trialEndsAt?: string | null;
  }
}