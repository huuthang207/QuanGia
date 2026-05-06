// src/render.js

function renderListByChoice(votes, users, choice, emptyText) {
  const entries = Object.entries(votes || {})
    .filter(([, v]) => v.choice === choice)
    .map(([discordId, v]) => ({
      ingameName:
        v.snapshot?.ingameName ?? users?.[discordId]?.ingameName ?? "Unknown",
      phai: v.snapshot?.phai ?? users?.[discordId]?.phai ?? "Unknown",
    }))
    .sort((a, b) => (a.ingameName || "").localeCompare(b.ingameName || ""));

  if (entries.length === 0) return `\`\`\`txt\n${emptyText}\n\`\`\``;

  const lines = entries.map(
    (e, idx) => `${idx + 1}. ${e.ingameName} - ${e.phai}`,
  );
  return "```txt\n" + lines.join("\n") + "\n```";
}

function countChoices(votes) {
  let go = 0,
    maybe = 0,
    nogo = 0;
  for (const v of Object.values(votes || {})) {
    if (v.choice === "GO") go++;
    else if (v.choice === "MAYBE") maybe++;
    else if (v.choice === "NOGO") nogo++;
  }
  const totalVote = go + maybe + nogo;
  return { go, maybe, nogo, totalVote };
}

function renderVoteSummaryCodeblock({ totalVote, go, maybe, nogo }) {
  return [
    "```txt",
    `📊 Tổng vote: ${totalVote}`,
    `✅ Tham gia: ${go}`,
    `❔ Dự bị: ${maybe}`,
    `❌ Không tham gia: ${nogo}`,
    "```",
  ].join("\n");
}

function renderPublicContent(activeSession, users, votes) {
  const header = activeSession?.headerText?.trim() || "Điểm danh Bang Chiến";

  const statusLine = activeSession?.isOpen
    ? "🟢 **Đang mở điểm danh**"
    : "🔒 **Đã đóng điểm danh**";

  const lastUpdate = activeSession?.lastUpdateAt
    ? new Date(activeSession.lastUpdateAt).toLocaleString("vi-VN")
    : "-";

  const counts = countChoices(votes);
  const voteBlock = renderVoteSummaryCodeblock(counts);

  const goBlock = renderListByChoice(votes, users, "GO", "Chưa có ai đăng ký.");
  const maybeBlock = renderListByChoice(
    votes,
    users,
    "MAYBE",
    "Chưa có ai chọn 'Dự bị'.",
  );
  const nogoBlock = renderListByChoice(
    votes,
    users,
    "NOGO",
    "Chưa có ai chọn 'Không tham gia'.",
  );

  return [
    `## ${header}`,
    statusLine,
    "",
    voteBlock,
    "**Danh sách tham gia:**",
    goBlock,
    "**Danh sách Dự bị:**",
    maybeBlock,
    "**Danh sách Không tham gia:**",
    nogoBlock,
    `**Cập nhật lần cuối:** **${lastUpdate}**`,
  ].join("\n");
}

module.exports = { renderPublicContent };
