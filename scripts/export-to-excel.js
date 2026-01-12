const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Создаём папку data если нет
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Генерируем имя файла с датой
const now = new Date();
const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const excelPath = path.join(dataDir, `config_${timestamp}.xlsx`);

// Загружаем текущие данные
const houses = require('../src/config/houses');
const texts = require('../src/config/texts');
const reviews = require('../src/config/reviews');
const settings = require('../src/config/settings');

// === Лист "Домики" ===
const housesRows = houses.map((house) => ({
  id: house.id,
  name: house.name,
  description: house.description,
  capacity: house.capacity,
  amenities: house.amenities.join(', '),
  price_low: house.price?.low || 0,
  price_high: house.price?.high || 0,
  photos: house.photos.join(', '),
}));

// === Лист "Тексты" ===
// Каждая строка текста — отдельная ячейка
const textsRows = [];
for (const [key, value] of Object.entries(texts)) {
  const lines = value.split('\n');
  for (let i = 0; i < lines.length; i++) {
    textsRows.push({
      key: i === 0 ? key : '',
      line: i + 1,
      text: lines[i],
    });
  }
}

// === Лист "Отзывы" ===
const reviewsRows = reviews.featured.map((r) => ({
  author: r.author,
  date: r.date,
  rating: r.rating,
  text: r.text,
}));

// === Лист "Настройки" ===
const settingsRows = Object.entries(settings).map(([key, value]) => ({
  key,
  value,
}));

// Создаём Excel
const workbook = XLSX.utils.book_new();

// Лист Домики
const housesSheet = XLSX.utils.json_to_sheet(housesRows);
housesSheet['!cols'] = [
  { wch: 10 }, { wch: 25 }, { wch: 50 }, { wch: 10 },
  { wch: 80 }, { wch: 12 }, { wch: 12 }, { wch: 100 },
];
XLSX.utils.book_append_sheet(workbook, housesSheet, 'Домики');

// Лист Тексты
const textsSheet = XLSX.utils.json_to_sheet(textsRows);
textsSheet['!cols'] = [{ wch: 15 }, { wch: 6 }, { wch: 80 }];
XLSX.utils.book_append_sheet(workbook, textsSheet, 'Тексты');

// Лист Отзывы
const reviewsSheet = XLSX.utils.json_to_sheet(reviewsRows);
reviewsSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 100 }];
XLSX.utils.book_append_sheet(workbook, reviewsSheet, 'Отзывы');

// Лист Настройки
const settingsSheet = XLSX.utils.json_to_sheet(settingsRows);
settingsSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
XLSX.utils.book_append_sheet(workbook, settingsSheet, 'Настройки');

XLSX.writeFile(workbook, excelPath);
console.log(`✅ Создан Excel файл: ${excelPath}`);
console.log('   Листы: Домики, Тексты, Отзывы, Настройки');
