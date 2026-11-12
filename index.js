const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// SỬA: Lấy Token và API Key từ biến môi trường của Render (An toàn tuyệt đối, không sợ bị GitHub khóa)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

client.once('ready', () => {
    console.log(`🤖 Bot AI Discord đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    console.log(`📩 Nhận câu hỏi từ ${message.author.username}: ${message.content}`);

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
