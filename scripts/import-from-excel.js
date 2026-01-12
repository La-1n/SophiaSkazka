const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const configDir = path.join(__dirname, '..', 'src', 'config');

// Ищем самый свежий файл config*.xlsx
const files = fs.readdirSync(dataDir).filter((f) => f.startsWith('config') && f.endsWith('.xlsx'));
if (files.length === 0) {
  console.error('❌ Не найден файл config*.xlsx в папке data/');
  process.exit(1);
}

// Сортируем по дате изменения (самый новый первый)
const sortedFiles = files
  .map((f) => ({ name: f, mtime: fs.statSync(path.join(dataDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);

const excelPath = path.join(dataDir, sortedFiles[0].name);
console.log(`📂 Импорт из: ${sortedFiles[0].name}\n`);

// Читаем Excel
const workbook = XLSX.readFile(excelPath);

// === Импорт домиков ===
const housesSheet = workbook.Sheets['Домики'];
const housesRows = XLSX.utils.sheet_to_json(housesSheet);

const houses = housesRows.map((row) => ({
  id: row.id || '',
  name: row.name || '',
  description: row.description || '',
  capacity: parseInt(row.capacity, 10) || 4,
  amenities: row.amenities ? row.amenities.split(',').map((s) => s.trim()) : [],
  price: {
    low: parseInt(row.price_low, 10) || 0,
    high: parseInt(row.price_high, 10) || 0,
  },
  photos: row.photos ? row.photos.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : [],
}));

fs.writeFileSync(
  path.join(configDir, 'houses.js'),
  `// Автоматически сгенерировано из data/config.xlsx\n// Запусти: npm run import\n\nmodule.exports = ${JSON.stringify(houses, null, 2)};\n`,
  'utf-8'
);
console.log(`✅ Домики: ${houses.length} шт.`);

// === Импорт текстов ===
const textsSheet = workbook.Sheets['Тексты'];
const textsRows = XLSX.utils.sheet_to_json(textsSheet);

// Собираем строки по ключам
const texts = {};
let currentKey = '';
for (const row of textsRows) {
  if (row.key) {
    currentKey = row.key;
    texts[currentKey] = row.text || '';
  } else if (currentKey) {
    texts[currentKey] += '\n' + (row.text || '');
  }
}

fs.writeFileSync(
  path.join(configDir, 'texts.js'),
  `// Автоматически сгенерировано из data/config.xlsx\n// Запусти: npm run import\n\nmodule.exports = ${JSON.stringify(texts, null, 2)};\n`,
  'utf-8'
);
console.log(`✅ Тексты: ${Object.keys(texts).length} шт.`);

// === Импорт настроек ===
const settingsSheet = workbook.Sheets['Настройки'];
const settingsRows = XLSX.utils.sheet_to_json(settingsSheet);

const settings = {};
for (const row of settingsRows) {
  if (row.key) {
    settings[row.key] = row.value;
  }
}

// === Импорт отзывов ===
const reviewsSheet = workbook.Sheets['Отзывы'];
const reviewsRows = XLSX.utils.sheet_to_json(reviewsSheet);

const featured = reviewsRows.map((row) => ({
  author: row.author || '',
  date: row.date || '',
  rating: parseInt(row.rating, 10) || 5,
  text: row.text || '',
}));

const reviews = {
  rating: parseFloat(settings.rating) || 5.0,
  totalReviews: parseInt(settings.totalReviews, 10) || 0,
  yandexMapsUrl: settings.yandexMapsUrl || '',
  featured,
};

fs.writeFileSync(
  path.join(configDir, 'reviews.js'),
  `// Автоматически сгенерировано из data/config.xlsx\n// Запусти: npm run import\n\nmodule.exports = ${JSON.stringify(reviews, null, 2)};\n`,
  'utf-8'
);
console.log(`✅ Отзывы: ${featured.length} шт.`);

// === Сохраняем настройки ===
fs.writeFileSync(
  path.join(configDir, 'settings.js'),
  `// Автоматически сгенерировано из data/config.xlsx\n// Запусти: npm run import\n\nmodule.exports = ${JSON.stringify(settings, null, 2)};\n`,
  'utf-8'
);
console.log(`✅ Настройки: ${Object.keys(settings).length} шт.`);

console.log('\n🎉 Импорт завершён!');
