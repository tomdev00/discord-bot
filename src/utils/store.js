// =============================================
//   utils/store.js  —  Persistência em JSON
// =============================================
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) { return path.join(DATA_DIR, `${name}.json`); }

function read(name) {
  try { return JSON.parse(fs.readFileSync(filePath(name), 'utf8')); }
  catch { return null; }
}

function write(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

const store = {
  // Sessão ativa de droga
  getSession:   ()     => read('session'),
  saveSession:  (data) => write('session', data),
  clearSession: ()     => write('session', null),

  // Acumulado semanal de sessões
  getWeekly:   () => read('weekly') || {
    drugs: {},           // { cocaina: { civilUnits, contratadoUnits, totalCost, totalRevenue, profit } }
    totalCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
  },
  saveWeekly:  (data) => write('weekly', data),
  clearWeekly: ()     => write('weekly', { drugs: {}, totalCost: 0, totalRevenue: 0, totalProfit: 0 }),

  // Meta semanal definida pela chefia
  getMeta:   ()     => read('meta'),
  saveMeta:  (data) => write('meta', data),
  clearMeta: ()     => write('meta', null),

  // Pens tracker
  getPens:   ()     => read('pens') || { remaining: 300, claimed: [], contributions: {}, messageId: null },
  savePens:  (data) => write('pens', data),

  // Quadro de membros
  getStatus:   ()     => read('status') || { messageId: null, members: {} },
  saveStatus:  (data) => write('status', data),

  // Mensagem da marcação diária
  getSchedule:   ()     => read('schedule') || { messageId: null },
  saveSchedule:  (data) => write('schedule', data),
};

module.exports = store;
