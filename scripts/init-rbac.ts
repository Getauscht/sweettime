// Load .env for local development when running scripts
import 'dotenv/config'
import '@/lib/env'
import { initializeRBAC } from '@/lib/auth/permissions'

async function run() {
  try {
    await initializeRBAC()
    console.log('RBAC initialization script completed.')
    process.exit(0)
  } catch (err) {
    console.error('RBAC initialization failed:', err)
    process.exit(1)
  }
}

run()
