import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    inferAdditionalFields({
      user: {
        roles: {
          type: 'string[]',
        },
      },
    }),
  ],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  resetPassword,
} = authClient

export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.Session.user
