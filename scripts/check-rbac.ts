// Load .env for local development when running scripts
import 'dotenv/config'
import '@/lib/env'
import { prisma } from '@/lib/prisma'

async function run() {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { name: 'asc' } })
    const roles = await prisma.role.findMany({ include: { rolePermissions: { include: { permission: true } } } })

    console.log('Permissions:', permissions.length)
    permissions.forEach(p => console.log(`- ${p.name}`))

    console.log('\nRoles:', roles.length)
    roles.forEach(r => {
      console.log(`- ${r.name} (id: ${r.id})`)
      console.log('  Permissions:')
      r.rolePermissions.forEach(rp => console.log(`    - ${rp.permission.name}`))
    })

    const rpCount = await prisma.rolePermission.count()
    console.log(`\nTotal rolePermission links: ${rpCount}`)

    process.exit(0)
  } catch (err) {
    console.error('Error checking RBAC:', err)
    process.exit(1)
  }
}

run()
