function buildVoteEntries(votes, users, choice) {
  return Object.entries(votes || {})
    .filter(([, v]) => v.choice === choice)
    .map(([discordId, v]) => ({
      discordId,
      ingameName:
        v.snapshot?.ingameName ?? users[discordId]?.ingameName ?? "Unknown",
      phai: v.snapshot?.phai ?? users[discordId]?.phai ?? "Unknown",
      updatedAt: v.updatedAt,
    }))
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
}

function renderVoteBlock(entries, emptyText) {
  if (entries.length === 0) {
    return `\`\`\`txt\n${emptyText}\n\`\`\``;
  }

  const lines = entries.map(
    (e, idx) => `${idx + 1}. ${e.ingameName} - ${e.phai}`,
  );
  return "```txt\n" + lines.join("\n") + "\n```";
}

function countVotes(votes) {
  const entries = Object.values(votes || {});
  const goCount = entries.filter((v) => v.choice === "GO").length;
  const nogoCount = entries.filter((v) => v.choice === "NOGO").length;
  const totalCount = entries.length;

  return { goCount, nogoCount, totalCount };
}

function renderPublicContent(activeSession, users, votes) {
  const goEntries = buildVoteEntries(votes, users, "GO");
  const nogoEntries = buildVoteEntries(votes, users, "NOGO");

  const goBlock = renderVoteBlock(goEntries, "Chưa có ai đăng ký tham gia.");
  const nogoBlock = renderVoteBlock(
    nogoEntries,
    "Chưa có ai chọn không tham gia.",
  );

  const lastUpdate = activeSession?.lastUpdateAt
    ? new Date(activeSession.lastUpdateAt).toLocaleString("vi-VN")
    : "-";

  const statusLine = activeSession?.isOpen
    ? "🟢 **Đang mở điểm danh**"
    : "🔒 **Đã đóng điểm danh**";

  const header = activeSession?.headerText?.trim() || "Điểm danh Bang Chiến";
  const { goCount, nogoCount, totalCount } = countVotes(votes);

  return [
    `## ${header}`,
    statusLine,
    "",
    `📊 **Tổng vote:** ${totalCount} | ✅ **Tham gia:** ${goCount} | ❌ **Không tham gia:** ${nogoCount}`,
    "",
    "**Danh sách tham gia:**",
    goBlock,
    "",
    "**Danh sách không tham gia:**",
    nogoBlock,
    "",
    `🕒 Last update: **${lastUpdate}**`,
  ].join("\n");
}

module.exports = { renderPublicContent };
