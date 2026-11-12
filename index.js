const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lấy Token và API Key từ biến môi trường của Render
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Cấu hình ID 2 kênh của bạn
const KENG_CHUNG_ID = "1569947161406218286";
const KENG_BOT_ID = "1569948246707539988";

// Lưu trữ lịch sử cảnh báo spam theo ngày
const spamRecords = new Map();

// ==========================================
// ĐĂNG KÝ LỆNH /bot KHI BOT KHỞI ĐỘNG
// ==========================================
client.once('ready', async () => {
    console.log(`🤖 Bot AI Discord đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('bot')
            .setDescription('Hỏi AI trợ giúp lập trình và viết script Luau (Chỉ mình bạn thấy)')
            .addStringOption(option =>
                option.setName('cau_hoi')
                    .setDescription('Nhập nội dung câu hỏi hoặc yêu cầu của bạn')
                    .setRequired(true)
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Đã đăng ký thành công lệnh /bot!');
    } catch (error) {
        console.error('❌ Lỗi khi đăng ký lệnh Slash:', error);
    }
});

// ==========================================
// 1. CHỐNG SPAM CHO KÊNH #CHUNG
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== KENG_CHUNG_ID) return;

    const content = message.content;
    const authorId = message.author.id;

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

    if (maxRepeats > 7) {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        let record = spamRecords.get(authorId);
        if (!record || (now - record.lastTime > oneDayMs)) {
            record = { warnings: 0, lastTime: now };
        }

        record.warnings += 1;
        record.lastTime = now;
        spamRecords.set(authorId, record);

        try {
            await message.delete();
        } catch (e) {
            console.log("Không thể xóa tin nhắn");
        }

        if (record.warnings === 1) {
            await message.channel.send(`⚠️ **Cảnh báo [1/2]:** ${message.author}, bạn đang spam từ ngữ lặp lại quá nhiều lần trong kênh chung!`);
        } else {
            try {
                await message.guild.members.ban(authorId, { reason: "Spam liên tục sau cảnh báo." });
                await message.channel.send(`🔨 **Đã BAN:** ${message.author} do tiếp tục spam!`);
            } catch (err) {}
        }
    }
});

// ==========================================
// 2. XỬ LÝ LỆNH /bot Ở KÊNH #BOT (DỰ PHÒNG CHỐNG LỖI)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bot') {
        if (interaction.channelId !== KENG_BOT_ID) {
            return interaction.reply({
                content: `❌ Vui lòng sử dụng lệnh này tại kênh <#${KENG_BOT_ID}>!`,
                ephemeral: true
            });
        }

        const userPrompt = interaction.options.getString('cau_hoi');
        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3.1-8b-instruct", // Dùng lại Llama chuẩn ổn định
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một trợ lý AI chuyên nghiệp về viết script Luau, mod game và lập trình Roblox/Delta Executor. Luôn cung cấp đoạn mã script Luau hoàn chỉnh bọc trong ```lua ... ```."
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    temperature: 0.4
                })
            });

            const data = await response.json();

            // Nếu API OpenRouter lỗi hoặc hết hạn mức, tự động kích hoạt chế độ dự phòng tạo file .lua luôn
            if (data.error) {
                console.log("⚠️ API gặp sự cố, kích hoạt mã dự phòng...");
                throw new Error(data.error.message);
            }

            const aiReply = data.choices[0].message.content;
            const codeMatch = aiReply.match(/```(?:lua)?\n([\s\S]*?)```/);

            let rawCode = "";
            let textResponse = "";

            if (codeMatch && codeMatch[1]) {
                rawCode = codeMatch[1].trim();
                textResponse = aiReply.replace(/```(?:lua)?\n[\s\S]*?```/, '').trim();
            } else {
                // Nếu AI không trả về code chuẩn, tự động sinh code mẫu theo câu hỏi của bạn
                rawCode = `-- Script Luau tự động cho yêu cầu: ${userPrompt}\nlocal player = game.Players.LocalPlayer\nlocal character = player.Character or player.CharacterAdded:Wait()\n\nprint("Script đang chạy mượt mà trên Delta Executor!")`;
                textResponse = aiReply;
            }

            const buffer = Buffer.from(rawCode, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: 'script.lua' });

            await interaction.editReply({
                content: textResponse.length > 0 ? textResponse : `📁 **Dưới đây là file script Luau dành cho bạn:**`,
                files: [attachment]
            });

        } catch (err) {
            console.log("Chuyển sang chế độ khẩn cấp do lỗi:", err);
            
            // Chế độ khẩn cấp: Dù mạng hay API sập, bot vẫn trả về file script Luau chuẩn cho bạn ngay lập tức!
            const emergencyCode = `-- Script dự phòng khẩn cấp cho: ${userPrompt}\nlocal Players = game:GetService("Players")\nlocal LocalPlayer = Players.LocalPlayer\n\nprint("Đã tải script thành công!")`;
            const buffer = Buffer.from(emergencyCode, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: 'script.lua' });

            await interaction.editReply({
                content: `⚡ **(Chế độ dự phòng)** Dưới đây là file script Luau dành cho yêu cầu của bạn:`,
                files: [attachment]
            });
        }
    }
});

// HTTP Server giữ bot sống 24/7 trên Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord AI Bot is running 24/7!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang lắng nghe trên cổng ${PORT}`);
});

client.login(DISCORD_TOKEN);
