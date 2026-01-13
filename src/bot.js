const { Telegraf, Markup } = require('telegraf');
const houses = require('./config/houses');
const texts = require('./config/texts');
const reviews = require('./config/reviews');
const settings = require('./config/settings');

const DOTLINE = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈';
const HOUSES_PER_PAGE = 1;

// Хранилище ID сообщений для каждого пользователя (фото + описания)
const userMessages = new Map();

// Генерация ссылки на Telegram с шаблоном сообщения
function getTelegramBookingUrl(houseName) {
  const text = houseName
    ? `Здравствуйте! Хочу забронировать домик "${houseName}".`
    : 'Здравствуйте! Хочу забронировать домик.';
  return `https://t.me/Azret_0926?text=${encodeURIComponent(text)}`;
}

function createBot(token) {
  const bot = new Telegraf(token);

  // Главное меню (inline-кнопки)
  const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Наши домики', 'houses')],
    [
      Markup.button.callback('📍 Где мы', 'location'),
      Markup.button.callback('❓ FAQ', 'faq'),
    ],
    [
      Markup.button.callback('⭐ Отзывы', 'reviews'),
      Markup.button.callback('📞 Контакты', 'contacts'),
    ],
    [Markup.button.url('🌐 Наш сайт', settings.website)],
    [Markup.button.url('📸 Instagram', settings.instagram)],
  ]);

  const backToMenu = Markup.inlineKeyboard([
    [Markup.button.callback('« Назад в меню', 'menu')],
  ]);

  // Логирование сообщений
  bot.use((ctx, next) => {
    if (ctx.message) {
      const user = ctx.from;
      const text = ctx.message.text || '[медиа]';
      console.log(
        `[${new Date().toLocaleString()}] ${user.first_name} (@${user.username || 'no_username'}): ${text}`
      );
    }
    return next();
  });

  // Старт
  bot.start((ctx) => {
    ctx.reply(texts.welcome, { parse_mode: 'Markdown', ...mainMenu });
  });

  // Главное меню
  bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    await deleteUserMessages(ctx, userId);

    try {
      await ctx.editMessageText(texts.welcome, {
        parse_mode: 'Markdown',
        ...mainMenu,
      });
    } catch (e) {
      await ctx.deleteMessage();
      await ctx.reply(texts.welcome, {
        parse_mode: 'Markdown',
        ...mainMenu,
      });
    }
  });

  // Удаление сообщений пользователя
  async function deleteUserMessages(ctx, userId) {
    const msgIds = userMessages.get(userId);
    if (msgIds) {
      for (const msgId of msgIds) {
        try {
          await ctx.deleteMessage(msgId);
        } catch (e) {
          // Сообщение уже удалено
        }
      }
      userMessages.delete(userId);
    }
  }

  // Показать страницу домиков
  async function showHousesPage(ctx, page = 0) {
    const userId = ctx.from.id;
    await deleteUserMessages(ctx, userId);

    const totalPages = Math.ceil(houses.length / HOUSES_PER_PAGE);
    const startIdx = page * HOUSES_PER_PAGE;
    const pageHouses = houses.slice(startIdx, startIdx + HOUSES_PER_PAGE);

    // Удаляем текущее сообщение
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Сообщение уже удалено
    }

    const sentMsgIds = [];

    // Отправляем каждый домик отдельно: фото + описание
    for (let i = 0; i < pageHouses.length; i++) {
      const house = pageHouses[i];
      const isLast = i === pageHouses.length - 1;

      // Фото домика
      if (house.photos && house.photos.length > 0) {
        if (house.photos.length === 1) {
          const photoMsg = await ctx.replyWithPhoto(house.photos[0]);
          sentMsgIds.push(photoMsg.message_id);
        } else {
          const mediaGroup = house.photos.map((photo) => ({
            type: 'photo',
            media: photo,
          }));
          const photoMessages = await ctx.replyWithMediaGroup(mediaGroup);
          sentMsgIds.push(...photoMessages.map((m) => m.message_id));
        }
      }

      // Описание домика
      let text = `🏡  *${house.name}*\n\n`;
      text += `${house.description}\n\n`;
      text += `👥 ${house.capacity} чел.`;
      if (house.price) {
        text += ` · 💰 ${house.price.low.toLocaleString()}–${house.price.high.toLocaleString()} ₽`;
      }
      text += `\n\n✨ ${house.amenities.join(', ')}`;

      if (isLast) {
        // Последний домик — добавляем кнопки
        const navButtons = [];
        if (page > 0) {
          navButtons.push(Markup.button.callback('« Назад', `houses_page_${page - 1}`));
        }
        if (page < totalPages - 1) {
          navButtons.push(Markup.button.callback('Далее »', `houses_page_${page + 1}`));
        }

        const buttons = [];
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
        buttons.push([Markup.button.url('✈️ Забронировать', getTelegramBookingUrl(house.name))]);
        buttons.push([Markup.button.callback('« Назад в меню', 'menu')]);

        if (totalPages > 1) {
          text += `\n\n_Страница ${page + 1} из ${totalPages}_`;
        }

        await ctx.reply(text, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        });
      } else {
        // Не последний — просто описание
        const descMsg = await ctx.reply(text, { parse_mode: 'Markdown' });
        sentMsgIds.push(descMsg.message_id);
      }
    }

    userMessages.set(userId, sentMsgIds);
  }

  // Домики — первая страница
  bot.action('houses', async (ctx) => {
    await ctx.answerCbQuery();
    await showHousesPage(ctx, 0);
  });

  // Домики — переключение страниц
  bot.action(/houses_page_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1], 10);
    await showHousesPage(ctx, page);
  });

  // Локация
  bot.action('location', async (ctx) => {
    await ctx.answerCbQuery();

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          '🗺 Открыть на карте',
          settings.yandexMapsLocation
        ),
      ],
      [Markup.button.callback('« Назад в меню', 'menu')],
    ]);

    await ctx.editMessageText(texts.location, {
      parse_mode: 'Markdown',
      ...buttons,
    });
  });

  // FAQ
  bot.action('faq', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(texts.faq, {
      parse_mode: 'Markdown',
      ...backToMenu,
    });
  });

  // Отзывы
  bot.action('reviews', async (ctx) => {
    await ctx.answerCbQuery();

    let text = `⭐  *Отзывы гостей*\n`;
    text += `${DOTLINE}\n\n`;
    text += `🏆  *${reviews.rating} из 5* — ${reviews.totalReviews} отзывов\n\n`;

    for (const review of reviews.featured.slice(0, settings.maxReviews || 2)) {
      text += `${'⭐'.repeat(review.rating)}  _${review.author}, ${review.date}_\n`;
      text += `"${review.text}"\n\n`;
    }

    const buttons = Markup.inlineKeyboard([
      [Markup.button.url('📖 Все отзывы', reviews.yandexMapsUrl)],
      [Markup.button.callback('« Назад в меню', 'menu')],
    ]);

    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...buttons });
  });

  // Контакты
  bot.action('contacts', async (ctx) => {
    await ctx.answerCbQuery();

    const buttons = Markup.inlineKeyboard([
      [Markup.button.url('💬 WhatsApp', settings.whatsapp)],
      [Markup.button.url('✈️ Telegram', settings.telegram)],
      [Markup.button.callback('« Назад в меню', 'menu')],
    ]);

    await ctx.editMessageText(texts.contact, {
      parse_mode: 'Markdown',
      ...buttons,
    });
  });

  // Бронирование
  bot.action('booking', async (ctx) => {
    await ctx.answerCbQuery();

    const buttons = Markup.inlineKeyboard([
      [Markup.button.url('✈️ Написать в Telegram', settings.telegram)],
      [Markup.button.callback('🏠 Посмотреть домики', 'houses')],
      [Markup.button.callback('« Назад в меню', 'menu')],
    ]);

    await ctx.editMessageText(texts.bookingInfo, {
      parse_mode: 'Markdown',
      ...buttons,
    });
  });

  return bot;
}

module.exports = { createBot };
