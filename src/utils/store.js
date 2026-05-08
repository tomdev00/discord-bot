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

module.exports = {
  getSchedule: () => read("schedule") || { messageIds: [] },
  saveSchedule: (data) => write("schedule", data),

  getVotes: () => read("votes") || [],
  saveVotes: (data) => write("votes", data),
  clearVotes: () => write("votes", []),
};
