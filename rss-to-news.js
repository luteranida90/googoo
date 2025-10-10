const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "Mozilla/5.0 (GitHub Action)" }
});

const sources = [
  {url: 'https://www.sport.ru/rss/all_news.xml', source: 'Sport.ru', category: 'all'},
  {url: 'https://www.sports.ru/export/news.xml', source: 'Sports.ru', category: 'all'},
  {url: 'https://www.championat.com/rss/news.xml', source: 'Championat.com', category: 'all'},
  {url: 'https://www.cybersport.ru/rss/news', source: 'Cybersport.ru', category: 'cybersport'},
  {url: 'https://www.cybersport.ru/rss/dota-2/news', source: 'Cybersport.ru', category: 'dota2'},
  {url: 'https://www.cybersport.ru/rss/cs-go/news', source: 'Cybersport.ru', category: 'cs2'},
  {url: 'https://cyber.sports.ru/export/news.xml', source: 'Cyber.Sports.ru', category: 'cybersport'}
];

async function fetchAll() {
  let all = [];
  for (const src of sources) {
    try {
      const feed = await parser.parseURL(src.url);
      feed.items.slice(0, 15).forEach(item => {
        all.push({
          id: Buffer.from(item.link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
          title: clean(item.title),
          description: clean(item.contentSnippet || item.summary || ''),
          fullText: clean((item.content || item.summary || item.contentSnippet || '').split('. ').slice(0, 4).join('. ')),
          image: extractImg(item) || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
          source: src.source,
          category: src.category,
          url: item.link,
          time: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('Error for', src.url, e.message);
    }
  }
  // удаление дублирующихся по id
  let unique = Array.from(new Map(all.map(x => [x.id, x])).values());
  // сортировка по времени убывания
  unique.sort((a, b) => new Date(b.time) - new Date(a.time));
  fs.writeFileSync('news.json', JSON.stringify(unique.slice(0, 120), null, 2));
  console.log(`Got ${unique.length} news, saved to news.json`);
}

// Удаление html/тегов и обрезка лишнего
function clean(txt) {
  if (!txt) return '';
  return txt.replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim().slice(0, 260);
}

// Попытка вытащить картинку из enclosure/media/description/content
function extractImg(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content'].url) return item['media:content'].url;
  const c = item.content || item.description || '';
  const m = c.match(/<img[^>]*src=['\"]([^'\"]+)/);
  return m ? m[1] : null;
}

fetchAll();
