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

    const commands = [
        new SlashCommandBuilder()
            .setName('bot')
            .setDescription('Hỏi AI trợ giúp (Có thể đính kèm file code hoặc hình ảnh)')
            .addStringOption(option =>
                option.setName('cau_hoi')
                    .setDescription('Nội dung câu hỏi của bạn')
                    .setRequired(true)
            )
            .addAttachmentOption(option =>
                option.setName('tep_dinh_kem')
                    .setDescription('Đính kèm file script (.lua, .txt) hoặc hình ảnh (PNG, JPG)')
                    .setRequired(false)
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Đã đăng ký lệnh /bot hỗ trợ Vision (xem ảnh) thành công!');
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

// Xử lý lệnh /bot ở kênh #bot (Hỗ trợ đọc cả file text và hình ảnh)
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

        await interaction.deferReply({ ephemeral: true });

        // Xây dựng mảng nội dung tin nhắn gửi lên OpenRouter (Hỗ trợ đa phương thức: Text + Image/File)
        let messageContent = [];

        // Kiểm tra xem file đính kèm là hình ảnh hay là file text/code
        let isImage = false;
        if (attachedFile) {
            const contentType = attachedFile.contentType || "";
            if (contentType.startsWith("image/") || attachedFile.name.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
                isImage = true;
            }
        }

        // Nếu là file text/code, tải nội dung text nhúng vào prompt
        let promptText = userPrompt;
        if (attachedFile && !isImage) {
            try {
                const fileRes = await fetch(attachedFile.url);
                const fileText = await fileRes.text();
                if (fileText && fileText.length < 15000) {
                    promptText += `\n\nNội dung từ file đính kèm (${attachedFile.name}):\n\`\`\`\n${fileText}\n\`\`\``;
                }
            } catch (e) {
                console.log("Không thể đọc file:", e);
            }
        }

        // Đưa text vào nội dung gửi AI
        messageContent.push({
            type: "text",
            text: promptText
        });

        // Nếu là hình ảnh, cấu hình định dạng chuẩn để AI Vision đọc trực tiếp URL của ảnh
        if (attachedFile && isImage) {
            messageContent.push({
                type: "image_url",
                image_url: {
                    url: attachedFile.url
                }
            });
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-exp:free", // Sử dụng model thông minh có hỗ trợ đọc hình ảnh (Vision) cực tốt
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một trợ lý lập trình Roblox, Lua và Luau chuyên nghiệp. Hãy phân tích kỹ câu hỏi, nội dung file hoặc hình ảnh do người dùng cung cấp để đưa ra giải pháp chính xác."
                        },
                        {
                            role: "user",
                            content: messageContent
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
