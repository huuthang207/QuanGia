require("dotenv").config();

const { REST } = require("@discordjs/rest");
const {
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

function buildCommands() {
  const setchannel = new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Set kênh cố định cho điểm danh bang chiến")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  const diemdanh = new SlashCommandBuilder()
    .setName("diemdanhbangchien")
    .setDescription("Mở/đóng điểm danh bang chiến")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sc) =>
      sc
        .setName("open")
        .setDescription("Mở điểm danh")
        .addStringOption((opt) =>
          opt
            .setName("text")
            .setDescription("Nội dung hiển thị")
            .setRequired(false),
        ),
    )
    .addSubcommand((sc) =>
      sc.setName("close").setDescription("Đóng điểm danh"),
    );

  const capnhat = new SlashCommandBuilder()
    .setName("capnhatnhanvat")
    .setDescription("Cập nhật tên in-game và phái của bạn");

  return [setchannel.toJSON(), diemdanh.toJSON(), capnhat.toJSON()];
}

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error("Thiếu DISCORD_TOKEN / CLIENT_ID / GUILD_ID trong .env");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: buildCommands(),
  });

  console.log("✅ Deployed guild commands.");
}

deployCommands().catch((err) => {
  console.error(err);
  process.exit(1);
});
