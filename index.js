const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const axios = require('axios');
const {
    getRandomResponse,
    addUser,
    addAdmin,
    removeAdmin,
    addLearningResponse,
    deleteResponsesByKeyword,
    saveGif,
    getRandomGif
} = require('./utils/responseManager');
const { getShamsiDate, getGregorianDate } = require('./utils/dateManager');
const config = require('./config.json');

const bot = new TelegramBot(config.token, { polling: true });

let admins = [];
let messageCount = 0;
let forwardedCount = 0;
let videoCount = 0;
let selfieVideoCount = 0;
let audioCount = 0;
let voiceCount = 0;
let photoCount = 0;
let gifCount = 0;
let stickerCount = 0;
let animatedStickerCount = 0;
let activeUsers = {};
let membersAdded = 0;
let membersJoinedByLink = 0;
let membersLeft = 0;
let membersKicked = 0;
let membersMuted = 0;

async function loadAdmins() {
    try {
        const data = await fs.readFile('./data/admins.json', 'utf8');
        admins = JSON.parse(data || '[]');
    } catch (err) {
        console.error('Error reading admins.json:', err);
    }
}

loadAdmins();

let isFirstAdminSet = admins.length > 0;

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || "";
    const userId = msg.from.id;

    await addUser(msg.from);

    const isAdmin = admins.some(admin => admin.id === userId);

    if (!isFirstAdminSet) {
        if (!isAdmin) {
            await addAdmin(msg.from);
            isFirstAdminSet = true;
            return bot.sendMessage(chatId, "شما به عنوان مدیر انتخاب شدید.");
        }
    } else {
        if (isAdmin) {
            return await handleAdminCommands(chatId, msg, text);
        }
    }

    if (text.startsWith("+")) {
        return await handleAiQuery(chatId, text.slice(1).trim(), msg.message_id);
    }

    if (text.includes("تاریخ")) {
        return await sendDate(chatId);
    }

    if (text.toLowerCase().startsWith("عکس ")) {
        return await handleImageRequest(chatId, text.replace("عکس", "").trim());
    }

    messageCount++;
    activeUsers[userId] = (activeUsers[userId] || 0) + 1;

    if (msg.forward_from) {
        forwardedCount++;
    }
    if (msg.video) {
        videoCount++;
        if (msg.from.is_selfie) selfieVideoCount++;
    }
    if (msg.audio) {
        audioCount++;
    }
    if (msg.voice) {
        voiceCount++;
    }
    if (msg.photo) {
        photoCount++;
    }
    if (msg.document && msg.document.mime_type === 'image/gif') {
        gifCount++;
        await saveGif(msg.document.file_id, msg.document.file_name || `gif_${Date.now()}.gif`, bot, config.token); // ذخیره گیف
    }
    if (msg.sticker) {
        if (msg.sticker.is_animated) {
            animatedStickerCount++;
        } else {
            stickerCount++;
        }
    }

    // چت کردن ربات با گیف (20% احتمال ارسال گیف)
    if (Math.random() < 0.2) {
        const randomGif = await getRandomGif();
        if (randomGif) {
            await bot.sendAnimation(chatId, randomGif);
        }
    }

    const response = await getRandomResponse(text);
    if (response) {
        await bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
    }
});

async function handleAiQuery(chatId, query, messageId) {
    if (!query) {
        return bot.sendMessage(chatId, 'لطفاً یک پرسش معتبر وارد کنید.');
    }

    const api = `https://api.silohost.ir/ai/ai.php?text=${encodeURIComponent(query)}&model=gemini-pro`;
    try {
        const response = await axios.get(api);
        const aiResponse = response.data;

        if (!aiResponse.status || !aiResponse.data) {
            return bot.sendMessage(chatId, 'پاسخی دریافت نشد.');
        }

        return bot.sendMessage(chatId, aiResponse.data, { reply_to_message_id: messageId });
    } catch (error) {
        console.error('Error fetching AI response:', error);
        return bot.sendMessage(chatId, 'مشکلی در ارتباط با هوش مصنوعی وجود دارد.');
    }
}

async function handleAdminCommands(chatId, msg, text) {
    const repliedUser = msg.reply_to_message?.from;

    if (text === "ادمین" && repliedUser) {
        if (!admins.some(admin => admin.id === repliedUser.id)) {
            await addAdmin(repliedUser);
            return bot.sendMessage(chatId, `${repliedUser.first_name} به عنوان ادمین انتخاب شد.`);
        } else {
            return bot.sendMessage(chatId, `${repliedUser.first_name} قبلاً به عنوان ادمین انتخاب شده است.`);
        }
    }

    if (text === "عزل" && repliedUser) {
        const success = await removeAdmin(repliedUser);
        return bot.sendMessage(chatId, success ? `${repliedUser.first_name} از ادمینی حذف شد.` : `${repliedUser.first_name} ادمین نیست.`);
    }

    if (text.startsWith("حذف:")) {
        const keyword = text.replace("حذف:", "").trim();
        const success = await deleteResponsesByKeyword(keyword);
        return bot.sendMessage(chatId, success ? `پاسخ‌های مربوط به "${keyword}" با موفقیت حذف شد.` : `هیچ پاسخی برای "${keyword}" یافت نشد.`);
    }

    if (text.startsWith("یاد بگیر:")) {
        const parts = text.replace("یاد بگیر:", "").trim().split("!");
        const inputMessage = parts[0].trim();
        const responses = parts.slice(1).map(r => r.trim()).filter(r => r);

        if (responses.length > 0) {
            await addLearningResponse(inputMessage, responses);
            return bot.sendMessage(chatId, `پاسخ‌های جدید به "${inputMessage}" اضافه شد.`);
        } else {
            return bot.sendMessage(chatId, 'فرمت صحیح نیست. فرمت صحیح: یاد بگیر: ورودی! پاسخ1! پاسخ2');
        }
    }
}

async function sendDate(chatId) {
    const shamsiDate = getShamsiDate();
    const gregorianDate = getGregorianDate();
    return bot.sendMessage(chatId, `تاریخ شمسی: ${shamsiDate}\nتاریخ میلادی: ${gregorianDate}`);
}

async function sendStatusReport(chatId) {
    const shamsiDate = getShamsiDate();
    const gregorianDate = getGregorianDate();
    const currentTime = new Date().toLocaleTimeString('fa-IR');

    let topUser = { name: "هیچ‌کس", count: 0 };
    for (let userId in activeUsers) {
        if (activeUsers[userId] > topUser.count) {
            topUser = { name: activeUsers[userId].name || "کاربر", count: activeUsers[userId] };
        }
    }
    const statusMessage = `
♡ فعالیت های امروز تا این لحظه :

➲ تاریخ : ${shamsiDate} 
➲ ساعت : ${currentTime}

✛ کل پیام ها : ${messageCount}
✛ پیام فورواردی : ${forwardedCount}
✛ فیلم : ${videoCount}
✛ فیلم سلفی : ${selfieVideoCount}
✛ آهنگ : ${audioCount}
✛ ویس : ${voiceCount}
✛ عکس : ${photoCount}
✛ گیف : ${gifCount}
✛ استیکر : ${stickerCount}
✛ استیکر متحرک : ${animatedStickerCount}

✶ فعال ترین اعضای گروه:
• نفر اول🥇 :  
(${topUser.count} پیام | ${topUser.name})

✶ کاربران برتر در افزودن عضو :
هیچ فعالیتی ثبت نشده است!

✧ اعضای وارد شده با لینک : ${membersJoinedByLink}
✧ اعضای اد شده : ${membersAdded}
✧ کل اعضای وارد شده : ${membersAdded + membersJoinedByLink}
✧ اعضای اخراج شده : ${membersKicked}
✧ اعضای سکوت شده : ${membersMuted}
✧ اعضای لفت داده : ${membersLeft}
    `;

    await bot.sendMessage(chatId, statusMessage);
}

async function handleImageRequest(chatId, query) {
    const apiUrl = `https://api-free.ir/api/img.php?v=4&text=${encodeURIComponent(query)}`;

    try {
        const apiResponse = await axios.get(apiUrl);
        if (apiResponse.data?.result) {
            const images = apiResponse.data.result;
            const randomImage = images[Math.floor(Math.random() * images.length)];
            return bot.sendPhoto(chatId, randomImage);
        } else {
            return bot.sendMessage(chatId, `هیچ تصویری برای "${query}" یافت نشد.`);
        }
    } catch (error) {
        console.error('Error fetching image from API:', error);
        return bot.sendMessage(chatId, 'مشکلی در دریافت تصویر وجود دارد.');
    }
}
