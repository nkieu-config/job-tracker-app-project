import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin in the browser, so it works
// in both local dev and production without extra config.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
