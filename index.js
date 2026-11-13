const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const KENG_CHUNG_ID = "1569947161406218286";
const KENG_BOT_ID = "1569948246707539988";

const spamRecords = new Map();

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

// Chống spam kênh chung
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
        } catch (e) {}

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

// Xử lý lệnh /bot ở kênh #bot
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
                    model: "meta-llama/llama-3.1-8b-instruct",
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một trợ lý lập trình Roblox và Luau chuyên nghiệp."
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    temperature: 0.5
                })
            });

            const data = await response.json();

            if (data.error) {
                return await interaction.editReply(`❌ Lỗi từ hệ thống AI: ${data.error.message}`);
            }

            const aiReply = data.choices[0].message.content;
            const codeMatch = aiReply.match(/```(?:lua)?\n([\s\S]*?)```/);

            // Nếu AI có trả về đoạn mã code Luau thì tự động tách file .lua gửi riêng cho gọn
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
                // Nếu không có code (hoặc AI giải thích/từ chối bình thường), cứ in thẳng câu trả lời ra cho người dùng đọc
                const safeReply = aiReply.length > 1950 ? aiReply.substring(0, 1950) + "..." : aiReply;
                await interaction.editReply(safeReply);
            }

        } catch (err) {
            console.error("Lỗi kết nối:", err);
            await interaction.editReply("⚠️ Đã xảy ra lỗi kết nối tới máy chủ AI!");
        }
    }
});

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord AI Bot is running 24/7!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang lắng nghe trên cổng ${PORT}`);
});

client.login(DISCORD_TOKEN);
