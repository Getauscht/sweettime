/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';

type Config = {
  baseUrl: string;
  listPages: string[];
  selectors: Record<string, string>;
  workLinkRegex?: string;
  useListPageOnly?: boolean;
  listItem?: Record<string, string>;
  concurrency: number;
  delayMs: number;
  maxWorks: number; // 0 = unlimited
};

async function loadConfig(): Promise<Config> {
  const raw = await fs.readFile(path.join(__dirname, 'crawl-sweetscan.config.json'), 'utf8');
  return JSON.parse(raw) as Config;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchHTML(url: string) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'sweettime-crawler/1.0 (+https://yourdomain.example)' },
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

async function parseListPage(html: string, baseUrl: string, selector: string, onlyMatchPathRegex?: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $(selector).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const url = new URL(href, baseUrl);
      if (onlyMatchPathRegex) {
        const re = new RegExp(onlyMatchPathRegex);
        if (!re.test(url.pathname)) return;
      }
      links.add(url.toString());
    } catch (err) {
      // ignore invalid URLs
    }
  });
  return Array.from(links);
}

async function parseListPageItems(html: string, baseUrl: string, itemSelectors: Record<string, string>, onlyMatchPathRegex?: string) {
  const $ = cheerio.load(html);
  const items: any[] = [];
  const sel = itemSelectors.selector;
  if (!sel) return items;
  $(sel).each((_, el) => {
    const root = $(el);
    const extractText = (s?: string) => (s ? root.find(s).first().text().trim() || null : null);
    const extractAttr = (s?: string, attr = 'href') => {
      if (!s) return null;
      const found = root.find(s).first();
      if (!found || found.length === 0) return null;
      const v = found.attr(attr) || found.attr('data-src') || found.attr('src');
      if (!v) return null;
      try {
        return new URL(v, baseUrl).toString();
      } catch (err) {
        return null;
      }
    };

    // link
    const link = extractAttr(itemSelectors.link, 'href');
    if (onlyMatchPathRegex && link) {
      try {
        const u = new URL(link);
        const re = new RegExp(onlyMatchPathRegex);
        if (!re.test(u.pathname)) return; // skip this item
      } catch (err) {
        // ignore
      }
    }

    const coverEl = root.find(itemSelectors.cover || '').first();
    let cover: string | null = null;
    if (coverEl && coverEl.length > 0) {
      const style = coverEl.attr('style') || '';
      const m = /background-image\s*:\s*url\((['"]?)(.*?)\1\)/i.exec(style);
      if (m && m[2]) {
        try { cover = new URL(m[2], baseUrl).toString(); } catch (e) { cover = null; }
      } else {
        // try <img>
        const img = coverEl.find('img').first();
        const imgSrc = img.attr('src') || img.attr('data-src');
        if (imgSrc) {
          try { cover = new URL(imgSrc, baseUrl).toString(); } catch (e) { cover = null; }
        }
      }
    }

    items.push({
      url: link,
      title: extractText(itemSelectors.title),
      author: extractText(itemSelectors.author),
      cover,
      views: extractText(itemSelectors.views),
      likes: extractText(itemSelectors.likes),
    });
  });
  return items;
}

async function parseWorkPage(html: string, selectors: Record<string, string>, baseUrl: string) {
  const $ = cheerio.load(html);
  const getText = (sel: string) => $(sel).first().text().trim() || null;
  const getMany = (sel: string) => $(sel).map((_, e) => $(e).text().trim()).get().filter(Boolean);
  const getAttr = (sel: string, attr = 'src') => {
    const el = $(sel).first();
    if (!el || el.length === 0) return null;

    // 1) try the requested attribute (src, data-src, etc)
    const v = el.attr(attr);
    if (v) return new URL(v, baseUrl).toString();

    // 2) try to find an <img> inside the element
    const img = el.find('img').first();
    const imgSrc = img.attr('src') || img.attr('data-src');
    if (imgSrc) return new URL(imgSrc, baseUrl).toString();

    // 3) try to parse background-image from style attribute: background-image:url(...)
    const style = el.attr('style') || '';
    const m = /background-image\s*:\s*url\((['"]?)(.*?)\1\)/i.exec(style);
    if (m && m[2]) {
      try {
        return new URL(m[2], baseUrl).toString();
      } catch (err) {
        return null;
      }
    }

    return null;
  };

  return {
    title: getText(selectors.title),
    author: getText(selectors.author),
    description: getText(selectors.description),
    genres: getMany(selectors.genres),
    status: getText(selectors.status),
    cover: getAttr(selectors.cover),
    views: getText(selectors.views),
    likes: getText(selectors.likes),
  };
}

async function downloadImage(url: string, destDir: string) {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    await fs.mkdir(destDir, { recursive: true });
    const fileName = path.basename(new URL(url).pathname).split('?')[0] || `${Date.now()}.img`;
    const outPath = path.join(destDir, fileName);
    await fs.writeFile(outPath, res.data);
    return outPath;
  } catch (err) {
    console.warn('Failed to download image', url, (err as any).message || err);
    return null;
  }
}

async function main() {
  const cfg = await loadConfig();
  const discovered = new Set<string>();
  const itemsFound: any[] = [];
  const debugPages: any[] = [];
  console.log('Config loaded. Base URL:', cfg.baseUrl);

  // 1) Check robots.txt
  try {
    const robotsUrl = new URL('/robots.txt', cfg.baseUrl).toString();
    const rtxt = await axios.get(robotsUrl, { timeout: 5000 }).then((r) => r.data).catch(() => '');
    console.log('robots.txt preview:', rtxt.split('\n').slice(0, 10).join('\n'));
  } catch (err) {
    console.warn('robots.txt not available or failed to fetch');
  }

  // 2) Crawl list pages
  for (const lp of cfg.listPages) {
    const url = new URL(lp, cfg.baseUrl).toString();
    console.log('Fetching list page', url);
    try {
      const html = await fetchHTML(url);
      if (cfg.useListPageOnly && cfg.listItem) {
        const items = await parseListPageItems(html, cfg.baseUrl, cfg.listItem, cfg.workLinkRegex);
        console.log(`Found ${items.length} items on list page ${url}`);
        // capture debug info for this page
        debugPages.push({ url, mode: 'listItems', count: items.length, sample: items[0] || null });
        for (const it of items) itemsFound.push(it);
        // fallback: if no items found, try to detect links using selectors.workLink for debugging
        if (items.length === 0) {
          const links = await parseListPage(html, cfg.baseUrl, cfg.selectors.workLink, cfg.workLinkRegex);
          console.log(`Fallback link parse found ${links.length} links on ${url}`);
          debugPages.push({ url, mode: 'fallbackLinks', count: links.length, sample: links.slice(0, 5) });
          for (const l of links) discovered.add(l);
        }
      } else {
        const links = await parseListPage(html, cfg.baseUrl, cfg.selectors.workLink, cfg.workLinkRegex);
        console.log(`Found ${links.length} links on list page ${url}`);
        debugPages.push({ url, mode: 'links', count: links.length, sample: links.slice(0, 5) });
        for (const l of links) discovered.add(l);
      }
      await sleep(cfg.delayMs);
    } catch (err) {
      console.warn('Failed to fetch list page', url, (err as any).message || err);
    }
  }

  let results: any[] = [];
  if (cfg.useListPageOnly && itemsFound.length > 0) {
    console.log('Using list-page-only mode. Discovered items:', itemsFound.length);
    const cap = cfg.maxWorks > 0 ? Math.min(cfg.maxWorks, itemsFound.length) : itemsFound.length;
    const toProcessItems = itemsFound.slice(0, cap);
    results = await asyncMapLimit(toProcessItems, cfg.concurrency, async (item) => {
      try {
        // download cover if available
        if (item.cover) {
          const dest = await downloadImage(item.cover, path.join(process.cwd(), 'public', 'uploads', 'cover', 'sweetscan'));
          if (dest) item.coverLocal = dest;
        }
        await sleep(cfg.delayMs);
        return item;
      } catch (err) {
        console.warn('Failed processing item', item.url, (err as any).message || err);
        return null;
      }
    });
  } else {
    const workUrls = Array.from(discovered);
    console.log('Discovered works (before max cap):', workUrls.length);
    const cap = cfg.maxWorks > 0 ? Math.min(cfg.maxWorks, workUrls.length) : workUrls.length;
    const toProcess = workUrls.slice(0, cap);

    results = await asyncMapLimit(toProcess, cfg.concurrency, async (url) => {
      try {
        console.log('Fetching work', url);
        const html = await fetchHTML(url);
        const metaRaw = await parseWorkPage(html, cfg.selectors, cfg.baseUrl);
        const meta: any = metaRaw;
        // download cover
        if (meta.cover) {
          const dest = await downloadImage(meta.cover, path.join(process.cwd(), 'public', 'uploads', 'cover', 'sweetscan'));
          if (dest) meta.coverLocal = dest;
        }
        await sleep(cfg.delayMs);
        return { url, ...meta };
      } catch (err) {
        console.warn('Failed processing', url, (err as any).message || err);
        return null;
      }
    });
  }

  const filtered = results.filter(Boolean);
  const outPath = path.join(process.cwd(), 'tmp_sweetscan_works.json');
  await fs.writeFile(outPath, JSON.stringify(filtered, null, 2), 'utf8');
  console.log('Saved', filtered.length, 'works to', outPath);

  // save debug info to a debug file to help diagnose why some pages return no items
  try {
    const dbgPath = path.join(process.cwd(), 'tmp_sweetscan_debug.json');
    await fs.writeFile(dbgPath, JSON.stringify(debugPages, null, 2), 'utf8');
    console.log('Saved debug info to', dbgPath);
  } catch (err) {
    // ignore
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
