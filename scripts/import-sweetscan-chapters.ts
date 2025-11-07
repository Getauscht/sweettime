#!/usr/bin/env tsx
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function slugify(s: string) {
    return s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0000-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || `${Date.now()}`;
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function fetchHTML(url: string) {
    const res = await axios.get(url, {
        headers: { 'User-Agent': 'sweettime-importer/1.0 (+https://yourdomain.example)' },
        timeout: 20000,
    });
    return res.data as string;
}

async function asyncMapLimit<T, R>(items: T[], limit: number, fn: (t: T, idx: number) => Promise<R>) {
    const results: R[] = [];
    let i = 0;
    const workers: Promise<void>[] = [];
    async function worker() {
        while (i < items.length) {
            const idx = i++;
            try {
                const r = await fn(items[idx], idx);
                results[idx] = r;
            } catch (err) {
                console.error('Item failed', idx, err);
                results[idx] = null as unknown as R;
            }
        }
    }
    for (let w = 0; w < Math.min(limit, items.length); w++) workers.push(worker());
    await Promise.all(workers);
    return results;
}

type WorkEntry = { url: string; title: string };

async function loadWorks(): Promise<WorkEntry[]> {
    const file = path.join(process.cwd(), 'tmp_sweetscan_works.json');
    const raw = await fs.readFile(file, 'utf8');
    const items = JSON.parse(raw || '[]');
    return items.map((it: any) => ({ url: it.url, title: it.title }));
}

function parseChapterText(text: string) {
    if (!text) return null;
    // Expected format: "<number> - <title>"
    const m = text.trim().match(/^\s*([0-9]+)(?:\.(?:[0-9]+))?\s*-\s*(.*)$/);
    if (m) {
        return { number: parseInt(m[1], 10), title: (m[2] || '').trim() };
    }
    // fallback: try to extract leading number
    const m2 = text.trim().match(/^\s*(\d+)/);
    if (m2) return { number: parseInt(m2[1], 10), title: text.trim() };
    return null;
}

async function upsertScanlationGroup(name = 'sweetscan') {
    const slug = slugify(name);
    const existing = await prisma.scanlationGroup.findUnique({ where: { slug } }).catch(() => null);
    if (existing) return existing;
    return prisma.scanlationGroup.create({ data: { name, slug } });
}

async function importChaptersForWork(work: WorkEntry, opts: { dryRun?: boolean; concurrency?: number }) {
    console.log('Processing work:', work.title, work.url);

    // find webtoon in DB by title (try exact, then fallback to contains)
    let webtoon = await prisma.webtoon.findFirst({ where: { title: work.title } });
    if (!webtoon) {
        webtoon = await prisma.webtoon.findFirst({ where: { title: { contains: work.title } } }).catch(() => null as any);
    }
    if (!webtoon) {
        console.warn('Webtoon not found in DB for title:', work.title);
        return;
    }

    const html = await fetchHTML(work.url);
    const $main = cheerio.load(html);

    // Try to detect manga id for AJAX request
    const mangaId = $main('#manga-chapters-holder').attr('data-id') || $main('[data-id^="manga-"]').attr('data-id') || $main('[data-id]').attr('data-id');
    let chaptersHtml = html;
    if (mangaId) {
        try {
            const ajaxUrl = new URL('ajax/chapters/', work.url).toString();
            const body = new URLSearchParams({ action: 'manga_get_chapters', manga: mangaId }).toString();
            const res = await axios.post(ajaxUrl, body, {
                headers: { 'User-Agent': 'sweettime-importer/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 20000,
            });
            chaptersHtml = res.data as string;
        } catch (err) {
            console.warn('Failed to fetch chapters via AJAX for', work.url, (err as any).message || err);
        }
    }

    const $ = cheerio.load(chaptersHtml);

    // Parse chapter entries (wp-manga-chapter li > a)
    const chapters: { url: string; number?: number; title?: string }[] = [];
    $('li.wp-manga-chapter a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (!href || !text) return;
        const parsed = parseChapterText(text);
        if (!parsed) return;
        try {
            const u = new URL(href, work.url).toString();
            chapters.push({ url: u, number: parsed.number, title: parsed.title });
        } catch (err) {
            // ignore
        }
    });

    if (chapters.length === 0) {
        console.warn('No chapters found for', work.title);
        return;
    }

    // sort by number ascending
    chapters.sort((a, b) => (a.number || 0) - (b.number || 0));

    const group = await upsertScanlationGroup('sweetscan');

    // process chapters with limited concurrency in batches and wait 5s between each batch
    const concurrency = Math.max(1, (opts.concurrency || 3));
    for (let i = 0; i < chapters.length; i += concurrency) {
        const batch = chapters.slice(i, i + concurrency);
        await Promise.all(batch.map(async (ch) => {
            try {
                if (!ch.number) return null;
                // check if chapter exists
                const exists = await prisma.chapter.findFirst({ where: { webtoonId: webtoon.id, number: ch.number } });
                if (exists) {
                    console.log(`Chapter ${ch.number} already exists for ${work.title}, skipping.`);
                    return null;
                }

                console.log(`Fetching chapter ${ch.number}:`, ch.url);
                const chHtml = await fetchHTML(ch.url);
                const $$ = cheerio.load(chHtml);

                const images: string[] = [];
                // find images inside .reading-content > .page-break.no-gaps img
                $$('.reading-content .page-break.no-gaps').each((_, el) => {
                    const img = $$(el).find('img').first();
                    if (!img || img.length === 0) return;
                    const src = img.attr('src') || img.attr('data-src');
                    if (!src) return;
                    try {
                        images.push(new URL(src, ch.url).toString());
                    } catch (err) { }
                });

                // fallback: any img inside .reading-content
                if (images.length === 0) {
                    $$('.reading-content img').each((_, im) => {
                        const src = $$(im).attr('src') || $$(im).attr('data-src');
                        if (!src) return;
                        try { images.push(new URL(src, ch.url).toString()); } catch (err) { }
                    });
                }

                if (images.length === 0) {
                    console.warn('No images found for', ch.url);
                    return null;
                }

                if (opts.dryRun) {
                    console.log(`DRY: would create chapter ${ch.number} (${ch.title}) with ${images.length} pages for webtoon ${webtoon.title}`);
                    return null;
                }

                // create chapter
                const created = await prisma.chapter.create({
                    data: {
                        webtoonId: webtoon.id,
                        number: ch.number,
                        title: ch.title || null,
                        content: images,
                        scanlationGroupId: group.id,
                    }
                });
                console.log(`Created chapter ${created.number} (${created.id}) with ${images.length} pages for ${webtoon.title}`);
            } catch (err) {
                console.warn('Failed processing chapter', ch.url, (err as any).message || err);
            }
            // small politeness delay per item
            await sleep(500);
            return null;
        }));

        // if more batches remain, wait 5 seconds before next batch
        if (i + concurrency < chapters.length) {
            console.log(`Batch processed (${i + 1}-${Math.min(i + concurrency, chapters.length)}). Waiting 5s before next batch...`);
            await sleep(5000);
        }
    }
}

function parseArgList(arg?: string) {
    if (!arg) return [];
    return arg.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
    const argv = require('minimist')(process.argv.slice(2));
    const workArg: string | undefined = argv.works || argv.w;
    const dry: boolean = !!argv.dry || !!argv['dry-run'];
    const concurrencyArg: number = argv.concurrency ? parseInt(argv.concurrency, 10) : 3;

    const works = await loadWorks();

    let toProcess: WorkEntry[] = [];
    if (workArg) {
        const names = parseArgList(workArg);
        for (const n of names) {
            const found = works.find((w) => w.title && w.title.toLowerCase() === n.toLowerCase());
            if (found) toProcess.push(found);
            else console.warn('Work not found in tmp list:', n);
        }
    } else {
        // if no arg provided, process all
        toProcess = works;
    }

    console.log('Will process', toProcess.length, 'works. dryRun=', dry, 'concurrency=', concurrencyArg);

    for (const w of toProcess) {
        try {
            await importChaptersForWork(w, { dryRun: dry, concurrency: concurrencyArg });
        } catch (err) {
            console.warn('Failed work', w.title, (err as any).message || err);
        }
    }

    await prisma.$disconnect();
}

if (require.main === module) {
    main().catch((err) => {
        console.error('Import chapters failed', (err as any).message || err);
        process.exit(1);
    });
}
