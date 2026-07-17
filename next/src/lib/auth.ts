import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { setSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { ensureOrgForUser } from "@/lib/auth/org";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    baseURL,
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      passkey: schema.passkey,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    passkey({
      // Do NOT set a static `origin` — Safari verifies against the request
      // Origin header. A mismatch (localhost vs 127.0.0.1 vs LAN IP) fails silently.
      rpName: "Roster",
      rpID: new URL(baseURL).hostname,
      authenticatorSelection: {
        // Avoid forcing "platform" — Safari is picky; prefer discoverable passkeys.
        residentKey: "preferred",
        userVerification: "preferred",
      },
      registration: {
        requireSession: false,
        resolveUser: async ({ context }) => {
          const email =
            typeof context === "string"
              ? context
              : (context as { email?: string } | undefined)?.email;
          if (!email || typeof email !== "string") {
            throw new Error("Email is required");
          }
          const normalized = email.trim().toLowerCase();
          const [existing] = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.email, normalized))
            .limit(1);
          if (existing) {
            await ensureOrgForUser(existing.id, existing.name || normalized);
            return {
              id: existing.id,
              name: existing.name,
              email: existing.email,
              emailVerified: existing.emailVerified,
              createdAt: existing.createdAt,
              updatedAt: existing.updatedAt,
              image: existing.image ?? undefined,
            };
          }
          const id = crypto.randomUUID();
          const name = normalized.split("@")[0] || "Recruiter";
          const now = new Date();
          await db.insert(schema.user).values({
            id,
            name,
            email: normalized,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          });
          await ensureOrgForUser(id, name);
          return {
            id,
            name,
            email: normalized,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          };
        },
        // Registration alone does not create a session — do it here so Safari
        // users are signed in after a single Touch ID / Face ID prompt.
        afterVerification: async ({ ctx, user }) => {
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          if (!session) {
            throw new Error("Unable to create session");
          }
          const dbUser = await ctx.context.internalAdapter.findUserById(
            user.id,
          );
          if (!dbUser) {
            throw new Error("User not found");
          }
          await setSessionCookie(ctx, { session, user: dbUser });
          return { userId: user.id };
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
