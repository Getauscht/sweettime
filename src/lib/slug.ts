/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeName(name: string, maxLen = 100) {
    if (!name) return 'author'
    // Remove diacritics, lower case, keep alphanum and spaces
    let s = name.normalize('NFKD').replace(/\p{Diacritic}/gu, '')
    s = s.toLowerCase()
    s = s.replace(/[^a-z0-9\s-]/g, '')
    s = s.replace(/\s+/g, '-')
    s = s.replace(/-+/g, '-')
    s = s.replace(/^-|-$/g, '')
    if (s.length === 0) s = 'author'
    if (s.length > maxLen) s = s.substring(0, maxLen)
    return s
}

function randomSuffix(len = 5) {
    return Math.random().toString(36).substring(2, 2 + len)
}

/**
 * Gera um slug candidato normalizado a partir de um nome.
 * NÂO garante atomicidade — o chamador deve tentar criar e tratar P2002 se houver corrida.
 */
export async function generateSlug(prisma: any, name: string, maxAttempts = 8): Promise<string> {
    const base = normalizeName(name, 100)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let candidate = base
        if (attempt === 0) {
            candidate = base
        } else if (attempt <= 3) {
            candidate = `${base}-${attempt}`
        } else {
            candidate = `${base}-${randomSuffix(5)}`
        }

        // Ensure length <= 191 (DB column limit seen in migrations)
        if (candidate.length > 191) {
            const reserve = attempt <= 3 ? String(attempt).length + 1 : 8
            candidate = `${base.substring(0, 191 - reserve)}-${attempt}`
        }

        // Check existence
        const existing = await prisma.author.findUnique({ where: { slug: candidate } })
        if (!existing) return candidate
        // otherwise loop and try next candidate
    }

    // last resort: try some random longer suffixes
    for (let i = 0; i < 10; i++) {
        const candidate = `${base}-${randomSuffix(8)}`
        const existing = await prisma.author.findUnique({ where: { slug: candidate } })
        if (!existing) return candidate
    }

    throw new Error('Failed to generate unique slug')
}

export default generateSlug
