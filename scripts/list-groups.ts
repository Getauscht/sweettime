import { prisma } from '@/lib/prisma';

async function main() {
    const groups = await prisma.scanlationGroup.findMany({ take: 50, select: { id: true, name: true, slug: true } });
    console.log('Found groups:', groups.length);
    groups.forEach(g => console.log(g.id, g.slug, '-', g.name));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
