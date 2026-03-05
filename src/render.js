function buildList(votes, users, targetChoice) {
  const entries = Object.entries(votes || {})
    .filter(([, v]) => v.choice === targetChoice)
    .map(([discordId, v]) => ({
      discordId,
      ingameName: v.snapshot?.ingameName ?? users[discordId]?.ingameName ?? "Unknown",
      phai: v.snapshot?.phai ?? users[discordId]?.phai ?? "Unknown",
    }))
    .sort((a, b) => (a.ingameName || "").localeCompare(b.ingameName || ""));

  if (entries.length === 0) {
    return "```txt\nChưa có.\n```";
  }

  const lines = entries.map((e, idx) => `${idx + 1}. ${e.ingameName} - ${e.phai}`);
  return "```txt\n" + lines.join("\n") + "\n```";
}

function renderPublicContent(activeSession, users, votes) {
  const goBlock = buildList(votes, users, "GO");
  const nogoBlock = buildList(votes, users, "NOGO");

  const lastUpdate = activeSession?.lastUpdateAt
    ? new Date(activeSession.lastUpdateAt).toLocaleString("vi-VN")
    : "-";

  const statusLine = activeSession?.isOpen ? "🟢 **Đang mở điểm danh**" : "🔒 **Đã đóng điểm danh**";

  const goCount = Object.values(votes || {}).filter(v => v.choice === "GO").length;
  const nogoCount = Object.values(votes || {}).filter(v => v.choice === "NOGO").length;
const header = activeSession?.headerText?.trim() || "Điểm danh Bang Chiến";
  return [
    `## ${header}`,
    statusLine,
    "",
    `✅ **Tham gia: ${goCount}**`,
    goBlock,
    `❌ **Không tham gia: ${nogoCount}**`,
    nogoBlock,
    `🕒 Last update: **${lastUpdate}**`,
    "",
  ].join("\n");
}

module.exports = { renderPublicContent };
