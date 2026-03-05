require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Events,
} = require("discord.js");
const store = require("./store");
const { renderPublicContent } = require("./render");
const PHAI_OPTIONS = [
  "Toái Mộng",
  "Huyết Hà",
  "Thiết Y",
  "Cửu Linh",
  "Thần Tương",
  "Tố Vấn",
];

function isWrongGuild(interaction) {
  return interaction.guildId !== process.env.GUILD_ID;
}

function buildVoteComponents(sessionId, disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bc_go:${sessionId}`)
      .setLabel("Tham gia ✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`bc_nogo:${sessionId}`)
      .setLabel("Không tham gia ❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
  return [row];
}
function buildUpdatePhaiSelectComponents() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("char_update_pick_phai")
    .setPlaceholder("Chọn phái mới…")
    .addOptions(PHAI_OPTIONS.map((p) => ({ label: p, value: p })));

  return [new ActionRowBuilder().addComponents(select)];
}
function buildPhaiSelectComponents(sessionId, choice) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`bc_pick_phai:${sessionId}:${choice}`)
    .setPlaceholder("Chọn phái…")
    .addOptions(PHAI_OPTIONS.map((p) => ({ label: p, value: p })));

  return [new ActionRowBuilder().addComponents(select)];
}

function requireRightChannel(interaction, config) {
  if (!config.channelId)
    return {
      ok: false,
      reason: "Chưa set kênh. Admin dùng /setchannel trước.",
    };
  if (interaction.channelId !== config.channelId)
    return { ok: false, reason: "Lệnh này chỉ dùng trong kênh cố định." };
  return { ok: true };
}

function requireAdmin(interaction) {
  const adminRoleId = process.env.ADMIN_ROLE_ID;

  // fallback: nếu chưa set role thì vẫn cho Administrator (tuỳ bạn)
  const isAdminPerm = interaction.memberPermissions?.has("Administrator");

  const hasRole = adminRoleId
    ? interaction.member?.roles?.cache?.has(adminRoleId)
    : false;

  if (!hasRole && !isAdminPerm) {
    return { ok: false, reason: "Bạn không có quyền dùng lệnh này." };
  }

  return { ok: true };
}

function ensureUserActive(interaction, users) {
  const u = users[interaction.user.id];
  if (u && u.status === "INACTIVE") {
    return {
      ok: false,
      reason: "Bạn đang **INACTIVE**. Vui lòng liên hệ admin.",
    };
  }
  return { ok: true };
}

function normalizeIngameName(name) {
  return (name ?? "").trim();
}

async function updatePublicMessage(client) {
  const active = store.getActiveSession();
  if (!active) return;

  const channel = await client.channels
    .fetch(active.channelId)
    .catch(() => null);
  if (!channel) return;

  const msg = await channel.messages.fetch(active.messageId).catch(() => null);
  if (!msg) return;

  const users = store.getUsers();
  const votes = store.getSessionVotes(active.id);
  const content = renderPublicContent(active, users, votes);
  const components = buildVoteComponents(active.id, !active.isOpen);

  await msg.edit({ content, components });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // guildMemberUpdate
  ],
  partials: [Partials.GuildMember],
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (isWrongGuild(interaction)) return;

  const config = store.getConfig();

  // ---------- Slash Commands ----------
  if (interaction.isChatInputCommand()) {
    const adminCheck = requireAdmin(interaction);
    if (!adminCheck.ok)
      return interaction.reply({ content: adminCheck.reason, ephemeral: true });

    if (interaction.commandName === "setchannel") {
      store.setConfig({
        ...config,
        guildId: process.env.GUILD_ID,
        channelId: interaction.channelId,
      });
      return interaction.reply({
        content: "✅ Đã set kênh hiện tại làm kênh điểm danh bang chiến.",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "diemdanhbangchien") {
      const chCheck = requireRightChannel(interaction, config);
      if (!chCheck.ok)
        return interaction.reply({ content: chCheck.reason, ephemeral: true });

      const sub = interaction.options.getSubcommand();
      if (sub === "refresh") {
        const active = store.getActiveSession();
        if (!active) {
          return interaction.reply({
            content: "⚠️ Hiện không có đợt điểm danh nào để render lại.",
            ephemeral: true,
          });
        }

        await updatePublicMessage(client);

        return interaction.reply({
          content: "🔄 Đã render lại message điểm danh.",
          ephemeral: true,
        });
      }
      if (sub === "open") {
        const customText = interaction.options.getString("text", true);

        const sessionId = `s_${Date.now()}`;
        const activeSession = {
          id: sessionId,
          channelId: interaction.channelId,
          messageId: null,
          createdBy: interaction.user.id,
          createdAt: store.nowIso(),
          isOpen: true,
          voteCount: 0,
          lastUpdatedBy: interaction.user.id,
          lastUpdateAt: store.nowIso(),
          headerText: customText,
        };

        const users = store.getUsers();
        const votes = {};

        const content = renderPublicContent(activeSession, users, votes);
        const msg = await interaction.channel.send({
          content,
          components: buildVoteComponents(sessionId, false),
        });

        activeSession.messageId = msg.id;
        store.setActiveSession(activeSession);
        store.setSessionVotes(sessionId, votes);

        return interaction.reply({
          content: "✅ Đã mở điểm danh bang chiến.",
          ephemeral: true,
        });
      }

      if (sub === "close") {
        const active = store.getActiveSession();
        if (!active || !active.isOpen) {
          return interaction.reply({
            content: "⚠️ Không có đợt điểm danh nào đang mở.",
            ephemeral: true,
          });
        }

        active.isOpen = false;
        active.closedAt = store.nowIso();
        active.lastUpdateAt = store.nowIso();
        store.setActiveSession(active);

        await updatePublicMessage(client);

        const history = store.getSessionHistory();
        history[active.id] = { ...active };
        store.setSessionHistory(history);
        store.setActiveSession(null);

        return interaction.reply({
          content: "🔒 Đã đóng điểm danh.",
          ephemeral: true,
        });
      }
    }
    if (interaction.commandName === "capnhatnhanvat") {
      const users = store.getUsers();
      const u = users[interaction.user.id];

      // INACTIVE không cho dùng
      if (u && u.status === "INACTIVE") {
        return interaction.reply({
          content: "Bạn đang **INACTIVE**. Vui lòng liên hệ admin.",
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("char_update_name")
        .setTitle("Cập nhật nhân vật");

      const input = new TextInputBuilder()
        .setCustomId("ingameName")
        .setLabel("Ingame Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(u?.ingameName ?? "");

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }
  }

  // NOTE: Fix close flow: edit message trước khi clear activeSession
  // Vì phần trên return sớm, ta xử lý close đúng ở đây bằng cách tách logic:
  // (Để đơn giản, bạn hãy thay block "close" phía trên bằng block đã sửa ở phần PATCH dưới.)

  // ---------- Buttons ----------
  if (interaction.isButton()) {
    const [prefix, sessionId] = interaction.customId.split(":");
    if (prefix !== "bc_go" && prefix !== "bc_nogo") return;

    const active = store.getActiveSession();
    if (!active || !active.isOpen || active.id !== sessionId) {
      return interaction.reply({
        content: "⚠️ Đợt điểm danh này không còn mở hoặc không hợp lệ.",
        ephemeral: true,
      });
    }

    const users = store.getUsers();
    const userCheck = ensureUserActive(interaction, users);
    if (!userCheck.ok) {
      return interaction.reply({
        content: userCheck.reason,
        ephemeral: true,
      });
    }

    const choice = prefix === "bc_go" ? "GO" : "NOGO";
    const u = users[interaction.user.id];

    // Chưa link -> mở modal ngay
    if (!u) {
      const modal = new ModalBuilder()
        .setCustomId(`bc_link_name:${sessionId}:${choice}`)
        .setTitle("Link tài khoản ingame");

      const input = new TextInputBuilder()
        .setCustomId("ingameName")
        .setLabel("Điền tên ingame của bạn")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    // Đã link -> ack trước
    await interaction.deferUpdate();

    const votes = store.getSessionVotes(sessionId);
    votes[interaction.user.id] = {
      choice,
      updatedAt: store.nowIso(),
      snapshot: { ingameName: u.ingameName, phai: u.phai },
    };
    store.setSessionVotes(sessionId, votes);

    active.voteCount = Object.keys(votes).length;
    active.lastUpdatedBy = interaction.user.id;
    active.lastUpdateAt = store.nowIso();
    store.setActiveSession(active);

    await updatePublicMessage(client);
    return;
  }

  // ---------- Modal Submit ----------
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "char_update_name") {
      const users = store.getUsers();
      const u = users[interaction.user.id];

      if (u && u.status === "INACTIVE") {
        return interaction.reply({
          content: "Bạn đang **INACTIVE**. Vui lòng liên hệ admin.",
          ephemeral: true,
        });
      }

      const ingameName = normalizeIngameName(
        interaction.fields.getTextInputValue("ingameName"),
      );
      if (!ingameName) {
        return interaction.reply({
          content: "⚠️ Ingame name không hợp lệ.",
          ephemeral: true,
        });
      }

      const ingameIndex = store.getIngameIndex();
      const owner = ingameIndex[ingameName];
      if (owner && owner !== interaction.user.id) {
        return interaction.reply({
          content: "❌ Tên ingame đã được dùng. Vui lòng chọn tên khác.",
          ephemeral: true,
        });
      }

      const pending = store.getPendingLink();
      pending[interaction.user.id] = { mode: "CHAR_UPDATE", ingameName };
      store.setPendingLink(pending);

      return interaction.reply({
        content: `✅ Đã nhận ingame name: **${ingameName}**. Giờ chọn phái mới:`,
        components: buildUpdatePhaiSelectComponents(),
        ephemeral: true,
      });
    }

    const [prefix, sessionId, choice] = interaction.customId.split(":");
    if (prefix !== "bc_link_name") return;

    const active = store.getActiveSession();
    if (!active || !active.isOpen || active.id !== sessionId) {
      return interaction.reply({
        content: "⚠️ Đợt điểm danh này không còn mở.",
        ephemeral: true,
      });
    }

    const users = store.getUsers();
    const userCheck = ensureUserActive(interaction, users);
    if (!userCheck.ok)
      return interaction.reply({ content: userCheck.reason, ephemeral: true });

    const ingameName = normalizeIngameName(
      interaction.fields.getTextInputValue("ingameName"),
    );
    if (!ingameName) {
      return interaction.reply({
        content: "⚠️ Ingame name không hợp lệ.",
        ephemeral: true,
      });
    }

    const ingameIndex = store.getIngameIndex();
    const owner = ingameIndex[ingameName];
    if (owner && owner !== interaction.user.id) {
      return interaction.reply({
        content: "❌ Tên ingame đã được dùng. Vui lòng chọn tên khác.",
        ephemeral: true,
      });
    }

    // pending link
    const pending = store.getPendingLink();
    pending[interaction.user.id] = { sessionId, choice, ingameName };
    store.setPendingLink(pending);

    return interaction.reply({
      content: `✅ Đã nhận ingame name: **${ingameName}**. Giờ chọn phái:`,
      components: buildPhaiSelectComponents(sessionId, choice),
      ephemeral: true,
    });
  }

  // ---------- Select Menu ----------
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "char_update_pick_phai") {
      const users = store.getUsers();
      const u = users[interaction.user.id];

      if (u && u.status === "INACTIVE") {
        return interaction.reply({
          content: "Bạn đang **INACTIVE**. Vui lòng liên hệ admin.",
          ephemeral: true,
        });
      }

      const pending = store.getPendingLink();
      const p = pending[interaction.user.id];
      if (!p || p.mode !== "CHAR_UPDATE") {
        return interaction.reply({
          content:
            "⚠️ Phiên cập nhật không hợp lệ. Vui lòng dùng lại /capnhatnhanvat.",
          ephemeral: true,
        });
      }

      const newName = p.ingameName;
      const newPhai = interaction.values[0];

      const ingameIndex = store.getIngameIndex();
      const owner = ingameIndex[newName];
      if (owner && owner !== interaction.user.id) {
        delete pending[interaction.user.id];
        store.setPendingLink(pending);
        return interaction.reply({
          content: "❌ Tên ingame đã được dùng. Vui lòng cập nhật lại.",
          ephemeral: true,
        });
      }

      const oldName = u?.ingameName;

      // update ingameIndex nếu đổi tên
      if (oldName && oldName !== newName) delete ingameIndex[oldName];
      ingameIndex[newName] = interaction.user.id;

      // update user
      users[interaction.user.id] = {
        ...u,
        ingameName: newName,
        phai: newPhai,
        status: u?.status ?? "ACTIVE",
        linkedAt: u?.linkedAt ?? store.nowIso(),
        updatedAt: store.nowIso(),
      };

      store.setUsers(users);
      store.setIngameIndex(ingameIndex);

      delete pending[interaction.user.id];
      store.setPendingLink(pending);

      // Nếu có session mở và user đã vote -> update snapshot vote hiện tại
      const active = store.getActiveSession();
      if (active && active.isOpen) {
        const votes = store.getSessionVotes(active.id);
        if (votes[interaction.user.id]) {
          votes[interaction.user.id].snapshot = {
            ingameName: newName,
            phai: newPhai,
          };
          votes[interaction.user.id].updatedAt = store.nowIso();
          store.setSessionVotes(active.id, votes);

          active.lastUpdatedBy = interaction.user.id;
          active.lastUpdateAt = store.nowIso();
          store.setActiveSession(active);

          await updatePublicMessage(client);
        }
      }

      return interaction.update({
        content: `✅ Đã cập nhật nhân vật thành: **${newName} - ${newPhai}**`,
        components: [],
      });
    }

    const [prefix, sessionId, choice] = interaction.customId.split(":");
    if (prefix !== "bc_pick_phai") return;

    const active = store.getActiveSession();
    if (!active || !active.isOpen || active.id !== sessionId) {
      return interaction.reply({
        content: "⚠️ Đợt điểm danh này không còn mở.",
        ephemeral: true,
      });
    }

    const users = store.getUsers();
    const userCheck = ensureUserActive(interaction, users);
    if (!userCheck.ok)
      return interaction.reply({ content: userCheck.reason, ephemeral: true });

    const pending = store.getPendingLink();
    const p = pending[interaction.user.id];
    if (!p || p.sessionId !== sessionId || p.choice !== choice) {
      return interaction.reply({
        content: "⚠️ Phiên link không hợp lệ. Vui lòng bấm GO/NOGO lại.",
        ephemeral: true,
      });
    }

    const phai = interaction.values[0];
    const ingameName = p.ingameName;

    // Re-check unique before commit
    const ingameIndex = store.getIngameIndex();
    const owner = ingameIndex[ingameName];
    if (owner && owner !== interaction.user.id) {
      delete pending[interaction.user.id];
      store.setPendingLink(pending);
      return interaction.reply({
        content: "❌ Tên ingame vừa bị trùng. Vui lòng link lại.",
        ephemeral: true,
      });
    }

    // Save user link
    users[interaction.user.id] = {
      ingameName,
      phai,
      status: "ACTIVE",
      linkedAt: store.nowIso(),
      updatedAt: store.nowIso(),
    };
    ingameIndex[ingameName] = interaction.user.id;

    store.setUsers(users);
    store.setIngameIndex(ingameIndex);

    delete pending[interaction.user.id];
    store.setPendingLink(pending);

    // Auto record vote
    const votes = store.getSessionVotes(sessionId);
    votes[interaction.user.id] = {
      choice,
      updatedAt: store.nowIso(),
      snapshot: { ingameName, phai },
    };
    store.setSessionVotes(sessionId, votes);

    active.voteCount = Object.keys(votes).length;
    active.lastUpdatedBy = interaction.user.id;
    active.lastUpdateAt = store.nowIso();
    store.setActiveSession(active);

    await interaction.update({
      content: `✅ Đã lưu thông tin.`,
      components: [],
    });
    await updatePublicMessage(client);
  }
});

// ---------- Role revoke -> set INACTIVE ----------
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.guild.id !== process.env.GUILD_ID) return;

  const roleId = process.env.BANG_VIEN_ROLE_ID;
  if (!roleId) return;

  const had = oldMember.roles.cache.has(roleId);
  const has = newMember.roles.cache.has(roleId);
  if (had === has) return;

  const users = store.getUsers();
  const uid = newMember.user.id;
  const u = users[uid];
  if (!u) return;

  u.status = has ? "ACTIVE" : "INACTIVE";
  u.updatedAt = store.nowIso();
  users[uid] = u;
  store.setUsers(users);
});

client.login(process.env.DISCORD_TOKEN);
