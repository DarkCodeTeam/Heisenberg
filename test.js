const axios = require('axios');

const license = "P57RevNkK4eFrpvZe2W2wJ5WESy9XqkbAjPxkRetrNuWr"; // لایسنس API

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || ""; // بررسی اینکه متن پیام خالی نباشد

    // اگر پیام با "+" شروع شود، درخواست به API ارسال می‌شود
    if (text.startsWith("+")) {
        const query = text.slice(1).trim(); // حذف علامت "+" از ابتدای متن

        // بررسی اینکه آیا query خالی است
        if (!query) {
            return bot.sendMessage(chatId, 'لطفاً یک پرسش معتبر وارد کنید.'); // پیام خطا برای پرسش خالی
        }

        const api = `https://api3.haji-api.ir/lic/gpt/4?q=${encodeURIComponent(query)}&license=${license}`;
        
        try {
            const response = await axios.get(api); // ارسال درخواست به API
            console.log('API Response:', response.data); // چاپ پاسخ API برای دیباگ
            
            // استفاده از کلید "result" به جای "answer"
            const aiResponse = response.data.result; // پاسخ از API

            // بررسی اینکه آیا aiResponse خالی است
            if (!aiResponse) {
                return bot.sendMessage(chatId, 'پاسخی دریافت نشد.'); // پیام خطا در صورت عدم وجود پاسخ
            }

            // ارسال پاسخ به کاربر به صورت ریپلای
            return bot.sendMessage(chatId, aiResponse, {
                reply_to_message_id: msg.message_id // استفاده از شناسه پیام کاربر برای ریپلای
            });
        } catch (error) {
            console.error('Error fetching AI response:', error);
            return bot.sendMessage(chatId, 'مشکلی در ارتباط با هوش مصنوعی وجود دارد.');
        }
    }

    // سایر کدها و دستورات شما
});
