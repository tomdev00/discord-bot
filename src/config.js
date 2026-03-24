// =============================================
//   config.js  —  Configuração do bot
//   Edita aqui os preços, materiais e opções
// =============================================

module.exports = {
  // ── Marcação diária ─────────────────────────
  SCHEDULE_HOURS: [
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
    "00:00+",
  ],
  SCHEDULE_EMOJIS: {
    yes: "✅",
    no: "❌",
    maybe: "🤷",
    contratado: "🔫",
  },

  // ── Drogas (sessões de protect) ─────────────
  // civil      = preço que pagas ao civil
  // contratado = preço que pagas ao contratado
  // venda      = preço a que tu vendes
  DRUGS: {
    cocaina: {
      name: "Cocaína",
      emoji: "🤍",
      civil: 1485,
      contratado: 1580,
      venda: 1940,
    },
    erva: {
      name: "Erva",
      emoji: "🌿",
      civil: 860,
      contratado: 880,
      venda: 1070,
    },
    meta: {
      name: "Meta",
      emoji: "🔵",
      civil: 1730,
      contratado: 1800,
      venda: 2210,
    },
    petro: {
      name: "Petro",
      emoji: "🛢️",
      civil: 8250,
      contratado: 8125,
      venda: 10730,
    },
    opio: {
      name: "Ópio",
      emoji: "🌸",
      civil: 1405,
      contratado: 1500,
      venda: 1830,
    },
  },

  // ── Materiais da meta semanal ───────────────
  // Estes são os 4 materiais + carrinha que podes pedir aos membros.
  // As quantidades pedidas cada semana são definidas via /meta-set no Discord.
  MATERIALS: {
    encomendas: { name: "Encomendas Especiais", emoji: "📦" },
    malas: { name: "Malas Seguras", emoji: "💼" },
    acos: { name: "Aços Inoxidáveis", emoji: "🔩" },
    pecas: { name: "Peças Oficina", emoji: "🔧" },
    carrinha: { name: "Carrinha de Droga", emoji: "🚐" },
  },

  // ── Pens ────────────────────────────────────
  PENS_TOTAL: 300,
  PENS_PER_CLICK: 20,
  PENS_CLAIM_EMOJI: "🖊️",

  // ── Relatório semanal ────────────────────────
  // 0 = Domingo, 1 = Segunda ... 6 = Sábado
  WEEKLY_REPORT_DAY: 0,
};
