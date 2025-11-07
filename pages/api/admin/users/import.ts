import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/auth/middleware'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

export const config = {
    api: {
        bodyParser: false,
    },
}

interface WordPressUser {
    ID: string
    user_login: string
    user_pass: string
    user_nicename: string
    user_email: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {

    console.log('Iniciando importação de usuários WordPress')

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    try {
        // Parse the multipart form data
        const form = new IncomingForm()
    
        const { files } = await new Promise<{ fields: any; files: any }>(
            (resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err)
                    else resolve({ fields, files })
                })
            }
        )

        const file = Array.isArray(files.file) ? files.file[0] : files.file

        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' })
        }

        // Basic validation: accept only .csv filenames when available
        const filename = (file.originalFilename || file.newFilename || file.name || '') as string
        if (filename && !filename.toLowerCase().endsWith('.csv')) {
            // Not strictly required, but provides early feedback
            return res.status(400).json({ error: 'Apenas arquivos CSV são suportados' })
        }

        // Read and parse CSV file
        const fileContent = fs.readFileSync(file.filepath, 'utf-8')
    
        let records: WordPressUser[]
        try {
            records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            })
        } catch (parseError) {
            console.error('CSV parse error:', parseError)
            return res.status(400).json({
                error: 'Arquivo CSV malformado ou inválido',
            })
        }

        // Validate CSV structure
        if (records.length === 0) {
            // cleanup temp file
            try { fs.unlinkSync(file.filepath) } catch (e) { /* ignore */ }
            return res.status(400).json({
                error: 'Arquivo CSV está vazio',
            })
        }

        // Deny huge imports to avoid accidental abuse
        const MAX_RECORDS = parseInt(process.env.ADMIN_IMPORT_MAX_RECORDS || '5000')
        if (records.length > MAX_RECORDS) {
            try { fs.unlinkSync(file.filepath) } catch (e) { /* ignore */ }
            return res.status(413).json({ error: `CSV muito grande. Limite: ${MAX_RECORDS} linhas` })
        }

        const requiredColumns = ['ID', 'user_login', 'user_pass', 'user_nicename', 'user_email']
        const firstRecord = records[0]
        const hasAllColumns = requiredColumns.every(col => col in firstRecord)

        if (!hasAllColumns) {
            return res.status(400).json({
                error: 'CSV deve conter as colunas: ID, user_login, user_pass, user_nicename, user_email',
                received: Object.keys(firstRecord),
            })
        }

        // Get reader role
        const readerRole = await prisma.role.findUnique({
            where: { name: 'reader' },
        })

        if (!readerRole) {
            return res.status(500).json({
                error: 'Role "reader" não encontrada. Execute o seed do banco de dados.',
            })
        }

        const results = {
            total: records.length,
            imported: 0,
            skipped: 0,
            errors: [] as Array<{ line: number; email: string; reason: string }>,
        }

        // Process each user
        for (let i = 0; i < records.length; i++) {
            const record = records[i]
            const lineNumber = i + 2 // +2 because CSV is 1-indexed and has header

            try {
                // Validate email
                if (!record.user_email || !record.user_email.includes('@')) {
                    results.errors.push({
                        line: lineNumber,
                        email: record.user_email || 'N/A',
                        reason: 'Email inválido',
                    })
                    continue
                }

                const email = record.user_email.toLowerCase().trim()

                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email },
                })

                if (existingUser) {
                    results.skipped++
                    continue
                }

                // Generate a random temporary password
                const tempPassword = crypto.randomBytes(16).toString('hex')
                const hashedPassword = await hash(tempPassword, 10)

                // Create user
                await prisma.user.create({
                    data: {
                        email,
                        name: record.user_nicename || record.user_login || email.split('@')[0],
                        password: hashedPassword,
                        mustChangePassword: true,
                        roleId: readerRole.id,
                        status: 'active',
                    },
                })

                results.imported++
            } catch (error) {
                console.error(`Error importing user at line ${lineNumber}:`, error)
                results.errors.push({
                    line: lineNumber,
                    email: record.user_email || 'N/A',
                    reason: 'Erro ao criar usuário no banco de dados',
                })
            }
        }
        // cleanup temp file
        try { fs.unlinkSync(file.filepath) } catch (e) { /* ignore */ }

        return res.status(200).json({
            success: true,
            message: `Importação concluída: ${results.imported} importados, ${results.skipped} pulados`,
            ...results,
        })
    } catch (error) {
        console.error('Import WordPress users error:', error)
        return res.status(500).json({
            error: 'Erro ao processar importação',
        })
    }
}
// Wrap handler with permission check. Keep the commented dev-bypass removed in favor of
// explicit protection using `withPermission`. The route must require USERS_CREATE.
export default withPermission(PERMISSIONS.USERS_CREATE, handler)
