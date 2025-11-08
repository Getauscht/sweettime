/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'

async function main() {
    const prisma = new PrismaClient()
    try {
        const csv = fs.readFileSync('test-wordpress-users.csv', 'utf8')
        const lines = csv.trim().split(/\r?\n/)
        const header = lines.shift()
        if (!header) return console.log('CSV vazio')
        const emails = lines.map(l => l.split(',').pop()?.trim().toLowerCase()).filter(Boolean) as string[]

        for (const email of emails) {
            const user = await prisma.user.findUnique({ where: { email } as any })
            if (!user) {
                console.log(`${email}: NÃO ENCONTRADO`)
            } else {
                console.log(`${email}: encontrado | id=${user.id} | mustChangePassword=${user.mustChangePassword}`)
            }
        }
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(e => { console.error(e); process.exit(1) })
