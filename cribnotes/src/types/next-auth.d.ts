import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    onboardingDone?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      onboardingDone?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingDone?: boolean;
  }
}