import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      personalSlug: string;
      displayName: string;
      aiProcessingConsent: boolean;
      communityEnabled: boolean;
      pastTodayEnabled: boolean;
    };
  }

  interface User {
    personalSlug?: string;
    displayName?: string | null;
    aiProcessingConsent?: boolean;
    communityEnabled?: boolean;
    pastTodayEnabled?: boolean;
  }
}
