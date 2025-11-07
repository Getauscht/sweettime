import { prisma } from '@/lib/prisma';

async function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: tsx scripts/check-novel-groups.ts <novelSlugOrId>');
        process.exit(2);
    }

    // Try to find by slug first, then id
    const novel = await prisma.novel.findFirst({
        where: { OR: [{ slug: arg }, { id: arg }] },
        select: { id: true, slug: true, title: true }
    });

    if (!novel) {
        console.error('Novel not found for', arg);
        process.exit(1);
    }

    console.log('Found novel:', novel);

    const novelGroups = await prisma.novelGroup.findMany({
        where: { novelId: novel.id },
        include: { group: true }
    });

    console.log('NovelGroups count:', novelGroups.length);
    novelGroups.forEach((ng) => {
        console.log(' - NovelGroup id:', ng.id, 'group:', ng.group?.id, ng.group?.name);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
