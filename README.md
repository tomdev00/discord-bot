# 🤖 Discord Manager Bot

A Discord bot for scheduling, session tracking, supply management, and member status boards.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📅 Daily Schedule | Posts every midnight with hours 13h–00h+ and ✅❌🤖 reactions. Bot reactions are display-only and **never counted as votes**. |
| 🗂️ Session Tracker | Track bought/sold items with fixed prices. Shows live cost, revenue, and profit. Automatically feeds into weekly totals. |
| 📊 Weekly Report | Auto-posts every Sunday with total units sold, cost, revenue, and profit. |
| 🖊️ Pens Tracker | 300-pen weekly supply. Members click a button to claim 20, bot asks for screenshot and marks them green on the status board. |
| 👥 Member Status Board | Shows all members with the tracked role as 🟢 (claimed) or 🔴 (not yet). Auto-updates on each claim. |

---

## 🚀 Setup (Step by Step)

### 1. Create a Discord Application & Bot

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** → click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Click **Reset Token** and copy your bot token
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Add Reactions`, `Manage Messages`, `Read Message History`
7. Open the generated URL and invite the bot to your server

### 2. Get IDs

Enable **Developer Mode** in Discord settings (Settings → Advanced → Developer Mode).

Then right-click to copy:
- Your **server** → Copy Server ID → `GUILD_ID`
- The **schedule channel** → Copy Channel ID → `SCHEDULE_CHANNEL_ID`
- The **session/summary channel** → Copy Channel ID → `SESSION_CHANNEL_ID`
- The **member status channel** → Copy Channel ID → `MEMBER_STATUS_CHANNEL_ID`
- The **role** you want to track → Server Settings → Roles → right-click → Copy Role ID → `TRACKED_ROLE_ID`
- Your **application ID** from the Developer Portal → `CLIENT_ID`

### 3. Configure the Bot

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/discord-manager-bot.git
cd discord-manager-bot

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Open `.env` and fill in all the values.

Open `src/config.js` and customise:
- Item names, emojis, cost and sell prices
- Total pens supply and pens per click
- Schedule hours

### 4. Deploy Slash Commands

Run this **once** to register all slash commands with Discord:

```bash
node src/deploy-commands.js
```

### 5. Start the Bot

```bash
npm start
```

The bot will log in, schedule cron jobs, and is ready to use.

---

## 📋 Slash Commands

### Session Management

| Command | Description |
|---|---|
| `/session-start` | Start a new item tracking session |
| `/session-add item: X quantity: N` | Add N of item X to the session |
| `/session-end` | Close the session and post a summary |
| `/session-status` | Show current session totals (ephemeral) |

### Admin Commands *(require Manage Messages or Admin)*

| Command | Description |
|---|---|
| `/schedule-post` | Manually post today's availability schedule |
| `/schedule-votes` | Show vote counts (bot excluded) |
| `/pens-post` | Post the weekly pens claim message |
| `/pens-reset` | Reset supply to full and reinit the status board |
| `/status-init` | Rebuild the status board from the tracked role |
| `/weekly-report` | Post the weekly report now and reset totals |

---

## 📁 Project Structure

```
discord-manager-bot/
├── src/
│   ├── index.js              # Bot entry point + cron jobs
│   ├── deploy-commands.js    # Run once to register slash commands
│   ├── config.js             # ⬅️ Edit this: items, prices, emojis
│   ├── commands/
│   │   ├── session.js        # /session-* commands
│   │   └── admin.js          # /schedule-*, /pens-*, /status-*, /weekly-* commands
│   └── utils/
│       ├── store.js          # JSON file persistence
│       ├── schedule.js       # Daily schedule post + vote counting
│       ├── session.js        # Session embeds + weekly merge
│       └── pens.js           # Pens tracker + member status board
├── data/                     # Auto-created, holds bot state (git-ignored)
├── .env.example              # Copy to .env and fill in
├── .gitignore
├── package.json
└── README.md
```

---

## 🔧 Customising Items

Edit `src/config.js`:

```js
ITEMS: {
  item1: { name: 'Iron Ore',  emoji: '⛏️', cost: 10, sell: 15 },
  item2: { name: 'Gold Bar',  emoji: '🥇', cost: 50, sell: 80 },
  // add up to 25 items — Discord allows 25 choices per slash command option
},
```

---

## 🌍 Hosting

For 24/7 uptime you can host the bot on:
- **Railway** (free tier available) — recommended for beginners
- **Fly.io**
- **VPS** (DigitalOcean, Hetzner) with `pm2 start src/index.js`

---

## 🤝 Contributing

PRs welcome! Open an issue first for large changes.

---

## 📜 License

MIT
