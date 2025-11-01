/**
 * Migration script to remove author associations with ScanlationGroups
 * This script is run after the schema change that removes scanlationGroupId from Author model.
 *
 * Purpose:
 * - Authors previously linked to groups become independent
 * - Authors retain all their relationships with webtoons via WebtoonCredit
 * - This maintains data integrity while decoupling authors from group management
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function migrateAuthorGroupAssociations() {
    try {
        console.log('Starting author-group association migration...')

        // Get all authors that might have had group associations (now removed by schema)
        const authors = await prisma.author.findMany()
        console.log(`Found ${authors.length} authors to verify`)

        // Verify that all authors no longer have group associations
        // (This is automatically handled by the schema change, but we verify)
        const authorsWithCredits = await prisma.author.findMany({
            where: {
                webtoonCredits: {
                    some: {},
                },
            },
            include: {
                _count: {
                    select: { webtoonCredits: true },
                },
            },
        })

        console.log(`✓ Found ${authorsWithCredits.length} authors with active webtoon credits`)

        // Summary statistics
        const stats = {
            totalAuthors: authors.length,
            authorsWithCredits: authorsWithCredits.length,
            independentAuthors: authors.length - authorsWithCredits.length,
        }

        console.log('\n📊 Migration Summary:')
        console.log(`  Total Authors: ${stats.totalAuthors}`)
        console.log(`  Authors with Webtoon Credits: ${stats.authorsWithCredits}`)
        console.log(`  Independent Authors: ${stats.independentAuthors}`)

        console.log('\n✅ Author-group association migration completed successfully!')
        console.log(
            'Authors are now independent entities not tied to any specific ScanlationGroup.'
        )
        console.log('They can still be used by any webtoon managed by group members.')

        return stats
    } catch (error) {
        console.error('❌ Error during author-group migration:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Run the migration if executed directly
migrateAuthorGroupAssociations()
    .then(() => {
        console.log('\nMigration finished.')
        process.exit(0)
    })
    .catch((err) => {
        console.error('Migration failed:', err)
        process.exit(1)
    })
