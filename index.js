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
            console.log("Không thể xóa tin nhắn (thiếu quyền Manage Messages)");
        }

        if (record.warnings === 1) {
            await message.channel.send(`⚠️ **Cảnh báo [1/2]:** ${message.author}, bạn đang spam từ ngữ lặp lại quá nhiều lần trong kênh chung! Vi phạm lần nữa trong hôm nay sẽ bị ban trực tiếp.`);
        } else {
            try {
                await message.guild.members.ban(authorId, { reason: "Spam từ lặp lại nhiều lần sau khi đã bị cảnh báo trong ngày." });
                await message.channel.send(`🔨 **Đã BAN:** Người dùng ${message.author} đã bị cấm khỏi máy chủ do tiếp tục spam sau khi đã nhận cảnh báo!`);
            } catch (err) {
                console.error("Lỗi khi ban thành viên:", err);
                await message.channel.send(`❌ ${message.author} đã spam tiếp nhưng bot không có quyền Ban (hãy kéo vai trò bot lên cao nhất trong server)!`);
            }
        }
    }
});

// ==========================================
// 2. XỬ LÝ LỆNH /bot Ở KÊNH #BOT (ẨN TIN NHẮN)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bot') {
        // Bắt buộc dùng đúng kênh #bot
        if (interaction.channelId !== KENG_BOT_ID) {
            return interaction.reply({
                content: `❌ Vui lòng sử dụng lệnh này tại kênh <#${KENG_BOT_ID}>!`,
                ephemeral: true
            });
        }

        const userPrompt = interaction.options.getString('cau_hoi');
        console.log(`📩 [Ẩn] Nhận câu hỏi từ ${interaction.user.username}: ${userPrompt}`);

        // Báo hiệu bot đang suy nghĩ ở chế độ ẩn (Chỉ người dùng thấy)
        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-chat:free", // Đã chuyển sang DeepSeek Chat miễn phí, cực kỳ mượt và ổn định
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một trợ lý AI chuyên nghiệp về viết script Luau, mod game và lập trình Roblox/Delta Executor. Khi người dùng yêu cầu viết code hoặc script, hãy cung cấp đoạn mã script Luau hoàn chỉnh được bọc trong cặp dấu ```lua ... ```."
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

            if (data.error) {
                console.error("Chi tiết lỗi từ API:", JSON.stringify(data.error, null, 2));
                await interaction.editReply(`❌ Lỗi từ hệ thống AI: ${data.error.message}`);
            } else {
                const aiReply = data.choices[0].message.content;
                const codeMatch = aiReply.match(/```(?:lua)?\n([\s\S]*?)```/);

                if (codeMatch && codeMatch[1]) {
                    const rawCode = codeMatch[1].trim();
                    let textResponse = aiReply.replace(/```(?:lua)?\n[\s\S]*?```/, '').trim();

                    if (textResponse.length > 1900) {
                        textResponse = textResponse.substring(0, 1900) + "...";
                    }

                    const buffer = Buffer.from(rawCode, 'utf-8');
                    const attachment = new AttachmentBuilder(buffer, { name: 'script.lua' });

                    await interaction.editReply({
                        content: textResponse.length > 0 ? textResponse : `📁 **Dưới đây là file script Luau dành cho bạn:**`,
                        files: [attachment]
                    });
                } else {
                    const safeReply = aiReply.length > 1950 ? aiReply.substring(0, 1950) + "..." : aiReply;
                    await interaction.editReply(safeReply);
                }
            }
        } catch (err) {
            console.error("Lỗi kết nối:", err);
            await interaction.editReply("⚠️ Đã xảy ra lỗi kết nối tới máy chủ AI!");
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
