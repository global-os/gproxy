import { runWithTransaction } from '@better-auth/core/context'
import { isDevelopment } from '@better-auth/core/env'
import { BASE_ERROR_CODES } from '@better-auth/core/error'
import { createAuthEndpoint } from '@better-auth/core/api'
import type { BetterAuthPlugin } from 'better-auth'
import {
  createEmailVerificationToken,
  formCsrfMiddleware,
} from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import { parseUserInput, parseUserOutput } from 'better-auth/db'
import { APIError } from 'better-call'
import * as z from 'zod'

const signUpEmailBodySchema = z
  .object({
    name: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().optional()
    ),
    email: z.email(),
    password: z.string().min(1),
    image: z.string().optional(),
    callbackURL: z.string().optional(),
    rememberMe: z.boolean().optional(),
  })
  .and(z.record(z.string(), z.any()))

export function optionalNameSignUpPlugin(): BetterAuthPlugin {
  return {
    id: 'optional-name-signup',
    endpoints: {
      signUpEmail: createAuthEndpoint(
        '/sign-up/email',
        {
          method: 'POST',
          operationId: 'signUpWithEmailAndPassword',
          use: [formCsrfMiddleware],
          body: signUpEmailBodySchema,
        },
        async (ctx) => {
          return runWithTransaction(ctx.context.adapter, async () => {
            if (
              !ctx.context.options.emailAndPassword?.enabled ||
              ctx.context.options.emailAndPassword?.disableSignUp
            ) {
              throw new APIError('BAD_REQUEST', {
                message: 'Email and password sign up is not enabled',
              })
            }

            const body = ctx.body
            const {
              name,
              email,
              password,
              image,
              callbackURL: _callbackURL,
              rememberMe,
              ...rest
            } = body
            const normalizedName =
              typeof name === 'string' && name.trim() ? name.trim() : undefined

            if (!z.email().safeParse(email).success) {
              throw new APIError('BAD_REQUEST', {
                message: BASE_ERROR_CODES.INVALID_EMAIL,
              })
            }
            if (!password || typeof password !== 'string') {
              throw new APIError('BAD_REQUEST', {
                message: BASE_ERROR_CODES.INVALID_PASSWORD,
              })
            }

            const minPasswordLength =
              ctx.context.password.config.minPasswordLength
            if (password.length < minPasswordLength) {
              throw new APIError('BAD_REQUEST', {
                message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT,
              })
            }

            const maxPasswordLength =
              ctx.context.password.config.maxPasswordLength
            if (password.length > maxPasswordLength) {
              throw new APIError('BAD_REQUEST', {
                message: BASE_ERROR_CODES.PASSWORD_TOO_LONG,
              })
            }

            if (
              (await ctx.context.internalAdapter.findUserByEmail(email))?.user
            ) {
              throw new APIError('UNPROCESSABLE_ENTITY', {
                message: BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL,
              })
            }

            const hash = await ctx.context.password.hash(password)
            let createdUser
            try {
              const data = parseUserInput(ctx.context.options, rest, 'create')
              createdUser = await ctx.context.internalAdapter.createUser({
                email: email.toLowerCase(),
                name: normalizedName as string,
                image,
                ...data,
                emailVerified: false,
              })
              if (!createdUser) {
                throw new APIError('BAD_REQUEST', {
                  message: BASE_ERROR_CODES.FAILED_TO_CREATE_USER,
                })
              }
            } catch (e) {
              if (isDevelopment())
                ctx.context.logger.error('Failed to create user', e)
              if (e instanceof APIError) throw e
              ctx.context.logger?.error('Failed to create user', e)
              throw new APIError('UNPROCESSABLE_ENTITY', {
                message: BASE_ERROR_CODES.FAILED_TO_CREATE_USER,
              })
            }

            await ctx.context.internalAdapter.linkAccount({
              userId: createdUser.id,
              providerId: 'credential',
              accountId: createdUser.id,
              password: hash,
            })

            if (
              ctx.context.options.emailVerification?.sendOnSignUp ||
              ctx.context.options.emailAndPassword?.requireEmailVerification
            ) {
              const token = await createEmailVerificationToken(
                ctx.context.secret,
                createdUser.email,
                undefined,
                ctx.context.options.emailVerification?.expiresIn
              )
              const callbackURL = body.callbackURL
                ? encodeURIComponent(body.callbackURL)
                : encodeURIComponent('/')
              const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`
              if (
                ctx.context.options.emailVerification?.sendVerificationEmail
              ) {
                await ctx.context.runInBackgroundOrAwait(
                  ctx.context.options.emailVerification.sendVerificationEmail(
                    { user: createdUser, url, token },
                    ctx.request
                  )
                )
              }
            }

            if (
              ctx.context.options.emailAndPassword?.autoSignIn === false ||
              ctx.context.options.emailAndPassword?.requireEmailVerification
            ) {
              return ctx.json({
                token: null,
                user: parseUserOutput(ctx.context.options, createdUser),
              })
            }

            const session = await ctx.context.internalAdapter.createSession(
              createdUser.id,
              rememberMe === false
            )
            if (!session) {
              throw new APIError('BAD_REQUEST', {
                message: BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION,
              })
            }

            await setSessionCookie(
              ctx,
              { session, user: createdUser },
              rememberMe === false
            )

            return ctx.json({
              token: session.token,
              user: parseUserOutput(ctx.context.options, createdUser),
            })
          })
        }
      ),
    },
  }
}
