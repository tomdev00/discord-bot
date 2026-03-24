// =============================================
//   utils/store.js  —  Persistência em JSON
// =============================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), "utf8"));
  } catch {
    return null;
  }
}

function write(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf8");
}

const store = {
  // Sessão ativa
  getSession: () => read("session"),
  saveSession: (data) => write("session", data),
  clearSession: () => write("session", null),

  // Acumulado semanal
  getWeekly: () =>
    read("weekly") || {
      drugs: {},
      totalCost: 0,
      totalRevenue: 0,
      totalProfit: 0,
    },
  saveWeekly: (data) => write("weekly", data),
  clearWeekly: () =>
    write("weekly", {
      drugs: {},
      totalCost: 0,
      totalRevenue: 0,
      totalProfit: 0,
    }),

  // Meta semanal
  getMeta: () => read("meta"),
  saveMeta: (data) => write("meta", data),
  clearMeta: () => write("meta", null),

  // Pens
  getPens: () =>
    read("pens") || {
      remaining: 300,
      claimed: [],
      contributions: {},
      messageId: null,
    },
  savePens: (data) => write("pens", data),

  // Quadro de membros
  getStatus: () => read("status") || { messageId: null, members: {} },
  saveStatus: (data) => write("status", data),

  // Marcação diária
  getSchedule: () => read("schedule") || { messageIds: [] },
  saveSchedule: (data) => write("schedule", data),

  // Painel da chefia
  getPanel: () => read("panel"),
  savePanel: (data) => write("panel", data),

  // Prints pendentes de confirmação
  getPendingPrints: () => read("pendingPrints") || {},
  savePendingPrints: (data) => write("pendingPrints", data),

  // Separador de dia (para não criar duplicados)
  getDaySeparator: () => read("daySeparator") || { date: null },
  saveDaySeparator: (data) => write("daySeparator", data),
};

module.exports = store;
