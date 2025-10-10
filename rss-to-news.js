const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser({
  timeout: 15000,
  headers: { 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  }
});

// Рабочие RSS-источники (проверены на октябрь 2025)
const sources = [
  // Общие спортивные новости
  {url: 'https://www.sports.ru/rss/main.xml', source: 'Sports.ru', category: 'all'},
  {url: 'https://www.sports.ru/rss/football.xml', source: 'Sports.ru', category: 'football'},
  {url: 'https://www.sports.ru/rss/hockey.xml', source: 'Sports.ru', category: 'hockey'},
  {url: 'https://www.sports.ru/rss/basketball.xml', source: 'Sports.ru', category: 'basketball'},
  
  // Championat (актуальные RSS)
  {url: 'https://www.championat.com/rss/championat.xml', source: 'Championat.com', category: 'all'},
  {url: 'https://www.championat.com/rss/football.xml', source: 'Championat.com', category: 'football'},
  
  // Альтернативные источники
  {url: 'https://www.interfax.ru/rss.asp', source: 'Interfax Спорт', category: 'all'},
  {url: 'https://tass.ru/rss/v2.xml', source: 'ТАСС Спорт', category: 'all'},
  
  // Киберспорт (альтернативные источники)
  {url: 'https://dtf.ru/rss/all', source: 'DTF Киберспорт', category: 'cybersport'}
];

async function fetchAll() {
  let all = [];
  let successCount = 0;
  
  for (const src of sources) {
    try {
      console.log(`Загрузка: ${src.url}`);
      const feed = await parser.parseURL(src.url);
      
      feed.items.slice(0, 15).forEach(item => {
        // Фильтруем только спортивные новости
        const title = item.title || '';
        const content = (item.contentSnippet || item.summary || '').toLowerCase();
        
        // Пропускаем политику, экономику и др.
        if (content.includes('путин') || content.includes('зеленск') || 
            content.includes('трамп') || content.includes('экономик')) {
          return;
        }
        
        all.push({
          id: generateId(item.link || item.guid || title),
          title: clean(title),
          description: clean(item.contentSnippet || item.summary || ''),
          fullText: clean((item.content || item.summary || item.contentSnippet || '').split('. ').slice(0, 5).join('. ')),
          image: extractImg(item) || getPlaceholderImage(src.category),
          source: src.source,
          category: src.category,
          url: item.link || item.guid || '',
          time: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        });
      });
      
      successCount++;
      console.log(`✓ Загружено из ${src.source}: ${feed.items.length} новостей`);
      
    } catch (e) {
      console.error(`✗ Ошибка ${src.url}:`, e.message);
    }
  }
  
  console.log(`\n📊 Итого загружено из ${successCount}/${sources.length} источников`);
  
  // Удаление дубликатов
  let unique = Array.from(new Map(all.map(x => [x.id, x])).values());
  
  // Сортировка по времени
  unique.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  // Сохраняем до 100 новостей
  const final = unique.slice(0, 100);
  
  fs.writeFileSync('news.json', JSON.stringify(final, null, 2));
  console.log(`\n✅ Сохранено ${final.length} новостей в news.json`);
}

// Генерация уникального ID
function generateId(text) {
  if (!text) return 'news-' + Date.now() + Math.random();
  return Buffer.from(text).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

// Очистка текста
function clean(txt) {
  if (!txt) return '';
  return txt
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

// Извлечение картинки
function extractImg(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content'].$) return item['media:content'].$.url;
  if (item['media:thumbnail'] && item['media:thumbnail'].$) return item['media:thumbnail'].$.url;
  
  const c = item.content || item.description || '';
  const m = c.match(/<img[^>]*src=['\"]([^'\"]+)['\"]/) || c.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
  return m ? m[1] : null;
}

// Placeholder изображения для категорий
function getPlaceholderImage(category) {
  const images = {
    'football': 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600',
    'basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600',
    'hockey': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
    'cybersport': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
    'all': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600'
  };
  return images[category] || images['all'];
}

// Запуск
fetchAll().catch(err => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});
