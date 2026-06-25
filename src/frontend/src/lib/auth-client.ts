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

type AuthErrorContext = {
  error?: { message?: string; status?: number }
  responseText?: string
}

export function authErrorMessage(ctx: AuthErrorContext): string {
  if (ctx.error?.message) return ctx.error.message

  if (ctx.responseText) {
    try {
      const parsed = JSON.parse(ctx.responseText) as { message?: string }
      if (parsed.message) return parsed.message
    } catch {
      if (ctx.responseText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
        return 'Server timed out. Please try again in a moment.'
      }
      const trimmed = ctx.responseText.trim()
      if (trimmed) return trimmed
    }
  }

  if (ctx.error?.status === 504) {
    return 'Server timed out. Please try again in a moment.'
  }
  if (ctx.error?.status === 429) {
    return 'Too many requests. Please try again later.'
  }

  return 'Something went wrong. Please try again.'
}
