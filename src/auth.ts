import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { ServerClient } from 'postmark'
import { optionalNameSignUpPlugin } from './auth/plugins/optional-name-signup.js'
import { hashPassword, verifyPassword } from './crypto/password.js'
import { db } from './db/index.js'
import { seedFixturesForUser } from './db/seed.js'
import * as schema from './db/schema.js'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'https://app.app.onetrueos.com',
  basePath: '/api/auth',
  telemetry: { enabled: false },
  plugins: [optionalNameSignUpPlugin()],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            const stats = await seedFixturesForUser(createdUser.id, createdUser.email)
            if (!stats) return

            const changes =
              stats.directoriesCreated + stats.filesCreated + stats.filesUpdated
            if (changes === 0) return

            console.log(
              `Seed: synced fixtures for new user ${createdUser.email} `
              + `(+${stats.directoriesCreated} dirs, +${stats.filesCreated} files, `
              + `~${stats.filesUpdated} updated)`,
            )
          } catch (err) {
            console.error(
              `[seed] failed to sync fixtures for new user ${createdUser.email}:`,
              err,
            )
          }
        },
      },
    },
  },
  rateLimit: {
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 10 },
    },
  },
  // Allow requests from the frontend development server
  trustedOrigins: [
    'http://localhost:5173',
    'http://app.app.dev.onetrueos.com:5173',
    'https://app.onetrueos.com',
    'https://app.app.onetrueos.com',
  ],
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.POSTMARK_SERVER_TOKEN) {
        console.log(`[DEV] Password reset link for ${user.email}:\n${url}`)
        return
      }
      const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN)
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? 'noreply@onetrueos.com',
        To: user.email,
        Subject: 'Reset your GlobalOS password',
        TextBody: `Click the link below to reset your password. This link expires in 1 hour.\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
        HtmlBody: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
        MessageStream: 'outbound',
      })
    },
  },
  socialProviders: {
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID ?? '',
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // },
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // },
  },
})

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
