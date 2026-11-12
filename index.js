const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lấy Token và API Key từ biến môi trường của Render (Bảo mật tuyệt đối)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Lưu trữ lịch sử cảnh báo spam theo ID người dùng (Tự động reset theo ngày)
const spamRecords = new Map();

client.once('ready', () => {
    console.log(`🤖 Bot AI Discord đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;

    // ==========================================
    // CẤU HÌNH ID CÁC KÊNH TRONG SERVER CỦA BẠN
    // ==========================================
    const KENG_CHUNG_ID = "ID_KENH_CHUNG_O_DAY"; // Thay ID kênh chung của bạn vào đây
    const KENG_BOT_ID = "ID_KENH_BOT_O_DAY";     // Thay ID kênh script/bot AI của bạn vào đây

    // ==========================================
    // 1. XỬ LÝ RIÊNG CHO KÊNH CHUNG (CHỐNG SPAM)
    // ==========================================
    if (channelId === KENG_CHUNG_ID) {
        const content = message.content;
        const authorId = message.author.id;

        // Thuật toán đếm từ lặp lại trong tin nhắn
        const words = content.toLowerCase().split(/\s+/);
        const wordCounts = {};
        let maxRepeats = 0;

        for (const word of words) {
            if (word.length > 0) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
                if (wordCounts[word] > maxRepeats) {
                    maxRepeats = wordCounts[word];
                }
            }
        }

        // Nếu có từ nào lặp lại TRÊN 7 lần (> 7)
        if (maxRepeats > 7) {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000; // 24 giờ (1 ngày)

            let record = spamRecords.get(authorId);

            // Kiểm tra xem đã qua 1 ngày chưa để reset bộ đếm cảnh báo
            if (!record || (now - record.lastTime > oneDayMs)) {
                record = { warnings: 0, lastTime: now };
            }

            record.warnings += 1;
            record.lastTime = now;
            spamRecords.set(authorId, record);

            // Xóa tin nhắn spam ngay lập tức
            try {
                await message.delete();
            } catch (e) {
                console.log("Không thể xóa tin nhắn (thiếu quyền Quản lý tin nhắn)");
            }

            if (record.warnings === 1) {
                // Lần 1 trong ngày: Cảnh báo
                await message.channel.send(`⚠️ **Cảnh báo [1/2]:** ${message.author}, bạn đang spam từ ngữ lặp lại quá nhiều lần trong kênh chung! Vi phạm lần nữa trong hôm nay sẽ bị ban trực tiếp.`);
            } else {
                // Lần 2 trở đi trong ngày: Ban thẳng tay
                try {
                    await message.guild.members.ban(authorId, { reason: "Spam từ lặp lại nhiều lần sau khi đã bị cảnh báo trong ngày." });
                    await message.channel.send(`🔨 **Đã BAN:** Người dùng ${message.author} đã bị cấm khỏi máy chủ do tiếp tục spam sau khi đã nhận cảnh báo!`);
                } catch (err) {
                    console.error("Lỗi khi ban thành viên:", err);
                    await message.channel.send(`❌ ${message.author} đã spam tiếp nhưng bot không có quyền Ban (hãy đảm bảo bot ở vị trí vai trò cao nhất trong server)!`);
                }
            }
        }
        return; // Dừng lại ở kênh chung, không chạy phần AI chat trả lời ở dưới
    }

    // ==========================================
    // 2. XỬ LÝ KÊNH AI / SCRIPT (TRỢ LÝ LẬP TRÌNH)
    // ==========================================
    if (channelId === KENG_BOT_ID) {
        console.log(`📩 Nhận câu hỏi script từ ${message.author.username}: ${message.content}`);

        await message.channel.sendTyping();

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3.1-8b-instruct",
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một trợ lý AI chuyên nghiệp về viết script Luau, mod game và lập trình Roblox/Delta Executor. Khi người dùng yêu cầu viết code hoặc script, hãy cung cấp đoạn mã script Luau hoàn chỉnh được bọc trong cặp dấu ```lua ... ```."
                        },
                        {
                            role: "user",
                            content: message.content
                        }
                    ],
                    temperature: 0.4
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error("Chi tiết lỗi từ API:", JSON.stringify(data.error, null, 2));
                message.reply(`❌ Lỗi từ hệ thống AI: ${data.error.message}`);
            } else {
                const aiReply = data.choices[0].message.content;
                const codeMatch = aiReply.match(/```(?:lua)?\n([\s\S]*?)```/);

                if (codeMatch && codeMatch[1]) {
                    const rawCode = codeMatch[1].trim();
                    const textResponse = aiReply.replace(/```(?:lua)?\n[\s\S]*?```/, '').trim();

                    if (textResponse.length > 0) {
                        await message.reply(textResponse);
                    }

                    const buffer = Buffer.from(rawCode, 'utf-8');
                    const attachment = new AttachmentBuilder(buffer, { name: 'script.lua' });

                    await message.channel.send({
                        content: `📁 **Dưới đây là file script Luau dành cho bạn:**`,
                        files: [attachment]
                    });

                } else {
                    if (aiReply.length > 2000) {
                        const chunks = aiReply.match(/[\s\S]{1,1990}/g);
                        for (const chunk of chunks) {
                            await message.channel.send(chunk);
                        }
                    } else {
                        await message.reply(aiReply);
                    }
                }
            }
        } catch (err) {
            console.error("Lỗi kết nối:", err);
            message.reply("⚠️ Đã xảy ra lỗi kết nối tới máy chủ AI!");
        }
    }
});

// Tạo HTTP Server phụ để Render.com cấp cổng mạng (Port) và giữ bot online 24/7
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord AI Bot is running 24/7!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang lắng nghe trên cổng ${PORT}`);
});

client.login(DISCORD_TOKEN);
