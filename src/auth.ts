import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/index.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
console.log('stripe is', stripe);

export const auth = betterAuth({
  logger: {
		disabled: false,
		disableColors: false,
		level: "debug",
		log: (level, message, ...args) => {
			// Custom logging implementation
			console.log(`[${level}] ${message}`, ...args);
		}
	},
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  // Allow requests from the frontend development server
  trustedOrigins: [
    'http://localhost:5173',
    'http://app.app.dev.onetrueos.com:5173',
    'https://app.onetrueos.com',
    'https://app.app.onetrueos.com',
  ],
  emailAndPassword: {
    enabled: true,
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
  databaseHooks: {
    user: {
      create: {
        async before() {
          console.log('about to call stripe')
        },
        async after(user, context) {
          console.log('really about to call stripe')
          await stripe.customers.create(user);
        }
      }
    }
  }
})

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
