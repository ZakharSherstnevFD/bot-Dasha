const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7128520234:AAExMV_jnbnIsn4lVml9wu2ukkB1_4iaIIQ';
const bot = new TelegramBot(token, { polling: true });

// Укажите ваш chatId для получения записей
const adminChatId = '-1002381258611';

// Хранение состояния пользователей
const userStates = {};

// Функция для получения имени пользователя и ссылки на его профиль
async function getUserProfile(userId) {
    try {
        const user = await bot.getChat(userId);
        const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
        const userLink = user.username ? `https://t.me/${user.username}` : `tg://user?id=${userId}`;
        return { userName, userLink };
    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
        return { userName: 'Пользователь', userLink: '#' };
    }
}

// Приветственное сообщение при первом входе
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    const welcomeMessage = `👋 Привет! Я бровист Даша, рада вас видеть в нашем уютном салоне. 🌿
Нажимайте кнопку "Записаться" и выбирайте удобное время! 🕒`;

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: 'Записаться' }],
                [{ text: 'О мастере 🧑‍🎨' }, { text: 'Услуги 💅' }, { text: 'Рекомендации по уходу 🧴' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
        },
    };

    bot.sendMessage(chatId, welcomeMessage, options);
    userStates[chatId] = 'awaitingAction'; // Пользователь в состоянии ожидания действия
});

// Обработка кнопок
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text || '';

    if (messageText === 'Записаться') {
        bot.sendMessage(chatId, '🗓 Когда вам удобно записаться на прием? Напишите любую удобную дату и время. 🕒 После этого мастер свяжется с вами в личных сообщениях и подтвердит бронь! 💬 Мы постараемся найти для вас идеальное время. 😊');
        userStates[chatId] = 'awaitingBooking';
        return;
    }

    if (messageText === 'О мастере 🧑‍🎨') {
        bot.sendMessage(chatId, '👩‍🎨 Меня зовут Даша, и я профессиональный бровист с 5-летним опытом! Я сделаю ваши брови идеальными и подчеркну вашу природную красоту. 🌟');
        return;
    }

    if (messageText === 'Услуги 💅') {
        bot.sendMessage(chatId, '💄 Вот список моих услуг:\n\n1. Коррекция бровей — 1000 руб.\n2. Окрашивание бровей — 1200 руб.\n3. Ламинирование бровей — 1500 руб.\n4. Архитектура бровей — 2000 руб.\n5. Долговременная укладка бровей — 1800 руб.');
        return;
    }

    if (messageText === 'Рекомендации по уходу 🧴') {
        bot.sendMessage(chatId, '✨ После процедуры важно ухаживать за бровями. Вот мои рекомендации:\n\n1. Не мочите брови первые 24 часа. 🚫💧\n2. Используйте питательные масла для поддержания блеска. 💆‍♀️\n3. Регулярно расчесывайте брови для придания формы. 🧖‍♀️');
        return;
    }

    // Обработка записи
    if (userStates[chatId] === 'awaitingBooking') {
        saveBooking(chatId, messageText);

        const { userName, userLink } = await getUserProfile(chatId);

        bot.sendMessage(chatId, `📩 Ваша запись получена: "${messageText}". 📨 Мастер свяжется с вами для подтверждения записи в ближайшее время. Спасибо! 🙌`);
        bot.sendMessage(adminChatId, `Новая запись от пользователя ${userName} (ID: ${chatId})\nСсылка на профиль: ${userLink}\nСообщение: "${messageText}".`);

        userStates[chatId] = 'awaitingAction'; // Возвращаем пользователя в состояние ожидания действий
    }
});

// Функция для сохранения записи в файл
function saveBooking(chatId, messageText) {
    const booking = { chatId, message: messageText };

    fs.appendFile('bookings.json', JSON.stringify(booking) + '\n', (err) => {
        if (err) throw err;
        console.log('Запись сохранена!');
    });
}

// Обработка команды /list для просмотра записей
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;

    fs.readFile('bookings.json', 'utf8', (err, data) => {
        if (err) {
            bot.sendMessage(chatId, 'Ошибка при чтении записей.');
            return;
        }

        const bookings = data.trim().split('\n').map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                console.error('Ошибка при парсинге строки:', line);
                return null;
            }
        }).filter(booking => booking !== null);

        const userBookings = bookings.filter(booking => booking.chatId === chatId);

        if (userBookings.length > 0) {
            const response = userBookings.map(booking => `📋 Запись: ${booking.message}`).join('\n');
            bot.sendMessage(chatId, `Ваши записи:\n${response}`);
        } else {
            bot.sendMessage(chatId, 'У вас нет записей.');
        }
    });
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.log('Ошибка polling:', error);
});
