import 'dotenv/config'
import { testConnection } from '../src/db/index.ts'
import { seedUserFixtures } from '../src/db/seed.ts'

await testConnection()
await seedUserFixtures()