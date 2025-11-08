import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `${Date.now()}`;
}

function mapStatus(src?: string) {
  if (!src) return 'ongoing';
  const s = src.toLowerCase();
  if (s.includes('complet') || s.includes('finished')) return 'completed';
  if (s.includes('hiatus')) return 'hiatus';
  if (s.includes('cancel') || s.includes('drop')) return 'cancelled';
  return 'ongoing';
}

async function upsertAuthor(name?: string) {
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.author.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.author.create({ data: { name, slug } });
}

async function upsertGenre(name?: string) {
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.genre.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.genre.create({ data: { name, slug } });
}

async function importAll() {
  const file = path.join(process.cwd(), 'tmp_sweetscan_works.json');
  const raw = await fs.readFile(file, 'utf8').catch((e) => {
    console.error('Failed to read tmp_sweetscan_works.json', (e as any)?.message || e);
    process.exit(1);
  });
  const items: any[] = JSON.parse(raw || '[]');
  console.log('Found', items.length, 'items to import');

  let created = 0;
  for (const it of items) {
    try {
      const title = (it.title || it.name || 'Untitled').trim();
      const slug = slugify(title);

      // author
      const author = await upsertAuthor(it.author);

      // upsert webtoon
      const coverLocal = it.coverLocal ? path.relative(process.cwd(), it.coverLocal).replace(/\\/g, '/') : null;
      let coverImageForDb: string | null = null;
      if (coverLocal) {
        // Ensure the file is served from /uploads/cover/<filename>
        const originalAbs = path.isAbsolute(it.coverLocal) ? it.coverLocal : path.join(process.cwd(), coverLocal);
        const filename = path.basename(originalAbs);
        const destDir = path.join(process.cwd(), 'public', 'uploads', 'cover');
        const destAbs = path.join(destDir, filename);
        try {
          await fs.mkdir(destDir, { recursive: true });
          // copy file if source != dest
          if (originalAbs !== destAbs) {
            await fs.copyFile(originalAbs, destAbs).catch(() => Promise.resolve());
          }
          // set DB path to the public uploads path
          coverImageForDb = '/' + path.posix.join('uploads', 'cover', filename);
        } catch (e) {
          console.warn('Failed to relocate cover image', originalAbs, (e as any)?.message || e);
          // fallback to relative path
          coverImageForDb = '/' + coverLocal.replace(/^public\//, '');
        }
      }
      const description = it.description || null;
      const status = mapStatus(it.status || it.progress || undefined);
      const views = parseInt((it.views || '').toString().replace(/\D/g, '') || '0', 10) || 0;
      const likes = parseInt((it.likes || '').toString().replace(/\D/g, '') || '0', 10) || 0;

      // upsert webtoon by slug
      const existing = await prisma.webtoon.findUnique({ where: { slug } });
      let webtoon;
      if (existing) {
        webtoon = await prisma.webtoon.update({
          where: { id: existing.id }, data: {
            title,
            description,
            coverImage: coverImageForDb || coverLocal || existing.coverImage,
            status,
            views: views || existing.views,
            likes: likes || existing.likes,
          }
        });
      } else {
        webtoon = await prisma.webtoon.create({
          data: {
            title,
            slug,
            description,
            coverImage: coverImageForDb || coverLocal || undefined,
            status,
            views,
            likes,
          }
        });
      }

      // credit author
      if (author) {
        try {
          await prisma.webtoonCredit.create({ data: { webtoonId: webtoon.id, authorId: author.id, role: 'AUTHOR' } });
        } catch (e) {
          // ignore duplicates
        }
      }

      // genres
      const genres = Array.isArray(it.genres) ? it.genres : (it.genres ? [it.genres] : []);
      for (const g of genres) {
        const gn = (g || '').trim();
        if (!gn) continue;
        const genre = await upsertGenre(gn);
        if (!genre) continue;
        try {
          await prisma.webtoonGenre.create({ data: { webtoonId: webtoon.id, genreId: genre.id } });
        } catch (e) {
          // ignore duplicates
        }
      }

      created++;
      console.log(`[${created}/${items.length}] Imported: ${title} (${webtoon.id})`);
    } catch (err) {
      console.warn('Failed to import item', it?.url || it?.title, (err as any).message || err);
    }
  }

  console.log('Import finished. Total imported:', created);
  await prisma.$disconnect();
}

if (require.main === module) {
  importAll().catch((err) => {
    console.error('Import failed', (err as any).message || err);
    process.exit(1);
  });
}
