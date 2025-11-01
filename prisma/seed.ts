import { prisma } from '../src/lib/prisma'
import { hash } from 'bcryptjs'
import { initializeRBAC } from '../src/lib/auth/permissions'


async function main() {
    console.log('🌱 Starting database seed...')

    // Initialize RBAC system
    console.log('📋 Initializing RBAC system...')
    await initializeRBAC()

    // Create admin user
    console.log('👤 Creating admin user...')
    const adminRole = await prisma.role.findUnique({
        where: { name: 'admin' },
    })

    if (adminRole) {
        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@storyverse.com' },
            update: {},
            create: {
                email: 'admin@storyverse.com',
                name: 'Admin User',
                password: await hash('admin123', 10),
                roleId: adminRole.id,
                status: 'active',
                emailVerified: new Date(),
            },
        })
        console.log(`✅ Admin user created: ${adminUser.email}`)
    }

    // Ensure admin-legacy ScanlationGroup exists and admin user is a leader
    console.log('👥 Ensuring admin-legacy scanlation group...')
    const adminUserForGroup = await prisma.user.findUnique({ where: { email: 'admin@storyverse.com' } })
    let adminLegacyGroup = await prisma.scanlationGroup.findUnique({ where: { slug: 'admin-legacy' } })
    if (!adminLegacyGroup) {
        adminLegacyGroup = await prisma.scanlationGroup.create({
            data: {
                name: 'Admin / Legacy Import',
                slug: 'admin-legacy',
                description: 'Group used to import legacy content and act as admin-owned fallbacks',
            },
        })
        console.log('✅ Created admin-legacy group')
    }

    if (adminUserForGroup) {
        await prisma.groupMember.upsert({
            where: { userId_groupId: { userId: adminUserForGroup.id, groupId: adminLegacyGroup.id } },
            update: { role: 'LEADER' },
            create: { userId: adminUserForGroup.id, groupId: adminLegacyGroup.id, role: 'LEADER' },
        })
        console.log('✅ Admin user attached to admin-legacy group as LEADER')
    }

    // Create sample authors
    console.log('👥 Creating sample authors...')
    const authors = await Promise.all([
        prisma.author.upsert({
            where: { slug: 'anya-petrova' },
            update: {},
            create: {
                name: 'Anya Petrova',
                slug: 'anya-petrova',
                bio: 'Fantasy and adventure webtoon creator',
            },
        }),
        prisma.author.upsert({
            where: { slug: 'ethan-blake' },
            update: {},
            create: {
                name: 'Ethan Blake',
                slug: 'ethan-blake',
                bio: 'Romance and drama storyteller',
            },
        }),
    ])

    // Create sample genres
    console.log('🏷️  Creating sample genres...')
    const genres = await Promise.all([
        prisma.genre.upsert({
            where: { slug: 'fantasy' },
            update: {},
            create: {
                name: 'Fantasy',
                slug: 'fantasy',
                description: 'Magical worlds and adventures',
            },
        }),
        prisma.genre.upsert({
            where: { slug: 'romance' },
            update: {},
            create: {
                name: 'Romance',
                slug: 'romance',
                description: 'Love stories and relationships',
            },
        }),
        prisma.genre.upsert({
            where: { slug: 'action' },
            update: {},
            create: {
                name: 'Action',
                slug: 'action',
                description: 'Thrilling combat and adventures',
            },
        }),
    ])

    // Create sample webtoons
    console.log('📖 Creating sample webtoons...')
    const webtoon1 = await prisma.webtoon.upsert({
        where: { slug: 'the-crimson-horizon' },
        update: {},
        create: {
            title: 'The Crimson Horizon',
            slug: 'the-crimson-horizon',
            description: 'An epic fantasy adventure about a young warrior',
            status: 'ongoing',
            views: 125000,
            likes: 12500,
            rating: 4.8,
        },
    })

    const webtoon2 = await prisma.webtoon.upsert({
        where: { slug: 'echoes-of-the-past' },
        update: {},
        create: {
            title: 'Echoes of the Past',
            slug: 'echoes-of-the-past',
            description: 'A romantic drama spanning different timelines',
            status: 'completed',
            views: 89000,
            likes: 8900,
            rating: 4.6,
        },
    })

    // Link authors to webtoons via credits (WebtoonCredit)
    await prisma.webtoonCredit.createMany({
        data: [
            { webtoonId: webtoon1.id, authorId: authors[0].id, role: 'AUTHOR' },
            { webtoonId: webtoon2.id, authorId: authors[1].id, role: 'AUTHOR' },
        ],
        skipDuplicates: true,
    })

    // Connect genres to webtoons
    await prisma.webtoonGenre.createMany({
        data: [
            { webtoonId: webtoon1.id, genreId: genres[0].id },
            { webtoonId: webtoon1.id, genreId: genres[2].id },
            { webtoonId: webtoon2.id, genreId: genres[1].id },
        ],
        skipDuplicates: true,
    })

    // Create sample chapters
    console.log('📄 Creating sample chapters...')
    await prisma.chapter.createMany({
        data: [
            {
                webtoonId: webtoon1.id,
                number: 1,
                title: 'The Beginning',
                content: JSON.stringify([]),
                views: 5000,
                likes: 450,
                scanlationGroupId: adminLegacyGroup?.id,
            },
            {
                webtoonId: webtoon1.id,
                number: 2,
                title: 'First Steps',
                content: JSON.stringify([]),
                views: 4500,
                likes: 420,
                scanlationGroupId: adminLegacyGroup?.id,
            },
        ],
        skipDuplicates: true,
    })

    // Backfill any existing webtoons/chapters/authors with null scanlationGroupId to adminLegacyGroup
    console.log('🔁 Backfilling existing records to admin-legacy group where missing...')
    if (adminLegacyGroup) {
        // Ensure sample webtoons are linked to adminLegacyGroup via WebtoonGroup
        await prisma.webtoonGroup.createMany({
            data: [
                { webtoonId: webtoon1.id, groupId: adminLegacyGroup.id },
                { webtoonId: webtoon2.id, groupId: adminLegacyGroup.id },
            ], skipDuplicates: true
        })

        console.log('✅ Backfill completed')
    }

    // Create activity log
    await prisma.activityLog.createMany({
        data: [
            {
                action: 'created',
                entityType: 'webtoon',
                entityId: webtoon1.id,
                details: `Título: '${webtoon1.title}', Autor: '${authors[0].name}'`,
                performedBy: 'system',
            },
            {
                action: 'created',
                entityType: 'author',
                entityId: authors[0].id,
                details: `Autor: '${authors[0].name}', Atualizou a biografia e links sociais`,
                performedBy: 'system',
            },
        ],
        skipDuplicates: true,
    })

    console.log('✅ Database seeded successfully!')
    console.log('\n📝 Credentials:')
    console.log('Email: admin@storyverse.com')
    console.log('Password: admin123')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
