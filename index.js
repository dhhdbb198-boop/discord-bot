const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

    // Đăng ký lệnh /bot có hỗ trợ thêm tùy chọn đính kèm file hoặc ảnh
    const commands = [
        new SlashCommandBuilder()
            .setName('bot')
            .setDescription('Hỏi AI trợ giúp lập trình (Có thể gửi kèm file hoặc ảnh)')
            .addStringOption(option =>
                option.setName('cau_hoi')
                    .setDescription('Nội dung câu hỏi của bạn')
                    .setRequired(true)
            )
            .addAttachmentOption(option =>
                option.setName('tep_dinh_kem')
                    .setDescription('Gửi kèm file hoặc hình ảnh (nếu có)')
                    .setRequired(false)
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Đã đăng ký lệnh /bot kèm tính năng đính kèm file/ảnh!');
    } catch (error) {
        console.error('❌ Lỗi đăng ký lệnh:', error);
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

// Xử lý lệnh /bot ở kênh #bot (Có hỗ trợ nhận file/ảnh và trả lời riêng tư)
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
        const attachedFile = interaction.options.getAttachment('tep_dinh_kem');

        // Báo hiệu đang suy nghĩ (Chỉ người dùng thấy)
        await interaction.deferReply({ ephemeral: true });

        // Nếu người dùng có gửi kèm file hoặc ảnh, ta gộp thông tin file vào câu hỏi để AI đọc
        let finalPrompt = userPrompt;
        if (attachedFile) {
            finalPrompt += `\n[Người dùng đính kèm file/ảnh: ${attachedFile.name} - Link: ${attachedFile.url}]`;
        }

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
                            content: "Bạn là trợ lý lập trình Roblox, Lua và Luau chuyên nghiệp."
                        },
                        {
                            role: "user",
                            content: finalPrompt
                        }
                    ],
                    temperature: 0.4
                })
            });

            const data = await response.json();

            if (data.error) {
                return await interaction.editReply(`❌ Lỗi từ hệ thống AI: ${data.error.message}`);
            }

            const aiReply = data.choices[0].message.content;

            // Phản hồi trực tiếp dạng văn bản, chỉ mình người đó thấy
            if (aiReply.length > 1950) {
                const chunks = aiReply.match(/[\s\S]{1,1950}/g);
                await interaction.editReply(chunks[0]);
                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followup({ content: chunks[i], ephemeral: true });
                }
            } else {
                await interaction.editReply(aiReply);
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
