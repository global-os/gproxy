import 'dotenv/config'
import { serve } from '@hono/node-server'
import { testConnection } from './db/index.js'
import { seedUserFixtures } from './db/seed.js'
import app from './app.js'
import { startRuntimeMaintenance } from './runtime/instance/manager.js'

export async function confirmTimeout(
  prompts: (config: any) => Promise<any>,
  message: string,
  timeoutMs: number,
  default_: boolean = false
): Promise<boolean> {
  const result = await Promise.race([
    prompts({ type: 'confirm', name: 'value', message }) as Promise<{
      value: boolean
    }>,
    new Promise<{ value: boolean }>((resolve) =>
      setTimeout(() => resolve({ value: default_ }), timeoutMs)
    ),
  ])
  if (result.value === default_) {
    console.log(`Timed out, defaulting to ${default_ ? 'yes' : 'no'}`)
  }
  return result.value
}

async function main() {
  await testConnection()

  if (!process.env.VERCEL) {
    const prompts = (await import('prompts'))?.default

    const value = await confirmTimeout(
      prompts,
      'Seed user fixtures?',
      5_000,
      false
    )
    if (value) {
      await seedUserFixtures()
    }
  }

  startRuntimeMaintenance()

  serve(
    {
      fetch: (request, ...args) => {
        console.log('=== FETCH CALLED ===')
        console.log('Request URL:', request.url)
        console.log('Request method:', request.method)
        return app.fetch(request, ...args)
      },
      port: Number(process.env.PORT) || 3000,
    },
    (info) => {
      console.log(`Server running on http://localhost:${info.port}`)
    }
  )
}

main()

export default app
