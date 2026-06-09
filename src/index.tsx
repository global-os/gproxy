import dotenv from 'dotenv'
import { serve } from '@hono/node-server'
import { testConnection } from './db/index.js'
import { seedUserFixtures } from './db/seed.js'
import app from './app.js'

dotenv.config()

async function main() {
  await testConnection()
  await seedUserFixtures()

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
