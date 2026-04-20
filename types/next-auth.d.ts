import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      paid: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    paid: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    paid?: boolean;
  }
}
