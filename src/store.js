const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const VOTES_DIR = path.join(DATA_DIR, "sessionVotes");

const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const INGAME_INDEX_PATH = path.join(DATA_DIR, "ingameIndex.json");
const ACTIVE_SESSION_PATH = path.join(DATA_DIR, "activeSession.json");
const SESSION_HISTORY_PATH = path.join(DATA_DIR, "sessionHistory.json");
const PENDING_LINK_PATH = path.join(DATA_DIR, "pendingLink.json");

// legacy (nếu còn)
const LEGACY_DB_PATH = path.join(DATA_DIR, "db.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(VOTES_DIR)) fs.mkdirSync(VOTES_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  ensureDirs();
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * Atomic write: ghi file tạm rồi rename
 * giúp tránh hỏng file khi crash giữa chừng.
 */
function writeJsonAtomic(filePath, data) {
  ensureDirs();
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function nowIso() {
  return new Date().toISOString();
}

// -------------------- CONFIG --------------------
function getConfig() {
  return readJson(CONFIG_PATH, { guildId: process.env.GUILD_ID, channelId: null });
}
function setConfig(next) {
  writeJsonAtomic(CONFIG_PATH, next);
}

// -------------------- USERS --------------------
function getUsers() {
  return readJson(USERS_PATH, {});
}
function setUsers(next) {
  writeJsonAtomic(USERS_PATH, next);
}

// -------------------- INGAME INDEX --------------------
function getIngameIndex() {
  return readJson(INGAME_INDEX_PATH, {});
}
function setIngameIndex(next) {
  writeJsonAtomic(INGAME_INDEX_PATH, next);
}

// -------------------- ACTIVE SESSION --------------------
/**
 * activeSession = null hoặc object:
 * { id, channelId, messageId, createdBy, createdAt, isOpen, voteCount, lastUpdatedBy, lastUpdateAt }
 */
function getActiveSession() {
  return readJson(ACTIVE_SESSION_PATH, null);
}
function setActiveSession(next) {
  writeJsonAtomic(ACTIVE_SESSION_PATH, next);
}

// -------------------- SESSION HISTORY --------------------
/**
 * sessionHistory = { [sessionId]: { ...metadata..., closedAt, isOpen:false, voteCount, lastUpdateAt } }
 */
function getSessionHistory() {
  return readJson(SESSION_HISTORY_PATH, {});
}
function setSessionHistory(next) {
  writeJsonAtomic(SESSION_HISTORY_PATH, next);
}

// -------------------- PENDING LINK --------------------
/**
 * pendingLink = { [discordId]: { sessionId, choice, ingameName } }
 */
function getPendingLink() {
  return readJson(PENDING_LINK_PATH, {});
}
function setPendingLink(next) {
  writeJsonAtomic(PENDING_LINK_PATH, next);
}

// -------------------- VOTES PER SESSION --------------------
function votesPath(sessionId) {
  return path.join(VOTES_DIR, `${sessionId}.json`);
}

/**
 * sessionVotes = { [discordId]: { choice, updatedAt, snapshot:{ingameName, phai} } }
 */
function getSessionVotes(sessionId) {
  return readJson(votesPath(sessionId), {});
}
function setSessionVotes(sessionId, next) {
  writeJsonAtomic(votesPath(sessionId), next);
}
function deleteSessionVotes(sessionId) {
  const p = votesPath(sessionId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// -------------------- MIGRATE FROM LEGACY db.json --------------------
/**
 * Chạy 1 lần khi bạn muốn chuyển từ data/db.json cũ sang multi-file.
 * An toàn: chỉ migrate nếu các file mới chưa tồn tại.
 */
function migrateFromLegacyIfNeeded() {
  ensureDirs();

  const hasNew =
    fs.existsSync(USERS_PATH) ||
    fs.existsSync(INGAME_INDEX_PATH) ||
    fs.existsSync(ACTIVE_SESSION_PATH) ||
    fs.existsSync(SESSION_HISTORY_PATH) ||
    fs.existsSync(PENDING_LINK_PATH);

  if (hasNew) return { migrated: false, reason: "New storage already exists." };
  if (!fs.existsSync(LEGACY_DB_PATH)) return { migrated: false, reason: "No legacy db.json found." };

  const legacy = readJson(LEGACY_DB_PATH, null);
  if (!legacy) return { migrated: false, reason: "Legacy db.json unreadable." };

  const users = legacy.users || {};
  const ingameIndex = legacy.ingameIndex || {};
  const pendingLink = legacy.pendingLink || {};

  // sessions cũ: tách active + history + votes per session
  const sessions = legacy.sessions || {};
  const activeSessionId = legacy.activeSessionId || null;

  let activeSession = null;
  const history = {};

  for (const [sid, s] of Object.entries(sessions)) {
    const meta = {
      id: sid,
      channelId: s.channelId,
      messageId: s.messageId,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
      closedAt: s.closedAt ?? null,
      isOpen: !!s.isOpen,
      voteCount: s.votes ? Object.keys(s.votes).length : 0,
      lastUpdateAt: s.lastUpdateAt ?? s.createdAt ?? nowIso(),
      lastUpdatedBy: null,
    };

    // votes
    if (s.votes) setSessionVotes(sid, s.votes);

    if (sid === activeSessionId && meta.isOpen) {
      activeSession = meta;
    } else {
      meta.isOpen = false;
      history[sid] = meta;
    }
  }

  setUsers(users);
  setIngameIndex(ingameIndex);
  setPendingLink(pendingLink);
  setActiveSession(activeSession);
  setSessionHistory(history);

  return { migrated: true };
}

module.exports = {
  nowIso,

  getConfig,
  setConfig,

  getUsers,
  setUsers,

  getIngameIndex,
  setIngameIndex,

  getActiveSession,
  setActiveSession,

  getSessionHistory,
  setSessionHistory,

  getPendingLink,
  setPendingLink,

  getSessionVotes,
  setSessionVotes,
  deleteSessionVotes,

  migrateFromLegacyIfNeeded,
};
