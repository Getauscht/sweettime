import { prisma } from '@/lib/prisma';

async function main() {
    const novelArg = process.argv[2];
    const groupArg = process.argv[3];
    if (!novelArg || !groupArg) {
        console.error('Usage: tsx scripts/associate-novel-group.ts <novelSlugOrId> <groupSlugOrId>');
        process.exit(2);
    }

    const novel = await prisma.novel.findFirst({ where: { OR: [{ slug: novelArg }, { id: novelArg }] }, select: { id: true, title: true } });
    if (!novel) {
        console.error('Novel not found:', novelArg);
        process.exit(1);
    }

    const group = await prisma.scanlationGroup.findFirst({ where: { OR: [{ slug: groupArg }, { id: groupArg }] }, select: { id: true, name: true } });
    if (!group) {
        console.error('Group not found:', groupArg);
        process.exit(1);
    }

    const existing = await prisma.novelGroup.findFirst({ where: { novelId: novel.id, groupId: group.id } });
    if (existing) {
        console.log('Association already exists:', existing.id);
        process.exit(0);
    }

    const created = await prisma.novelGroup.create({ data: { novelId: novel.id, groupId: group.id } });
    console.log('Created novelGroup association:', created.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
