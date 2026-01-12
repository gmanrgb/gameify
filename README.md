# 🎮 QuestLog

**Local-first goal gamification app** — Track your goals, earn XP, build streaks, and level up your life!

![QuestLog](https://via.placeholder.com/800x400/0f0f1a/667eea?text=QuestLog)

## ✨ Features

- **🎯 Goal Tracking** — Create daily, weekly, or monthly goals with custom tasks
- **⚡ XP & Leveling** — Earn experience points and level up as you complete goals
- **🔥 Streaks** — Build and maintain streaks to stay motivated
- **🏆 Badges** — Unlock achievements as you reach milestones
- **✨ Perfect Days** — Bonus XP for completing all daily goals
- **❄️ Freeze Tokens** — Protect your streaks when life gets busy
- **📊 Review** — Weekly and monthly progress dashboards
- **💾 Backup** — Export and import your data
- **🌈 Themes** — Four beautiful dark themes to choose from
- **🔒 Privacy** — All data stored locally, no cloud required

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [pnpm](https://pnpm.io/) v8 or later

### Installation

```bash
# Clone or download the project
cd questlog

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) for development (with hot reload)

### Production

```bash
# Build and start in production mode
pnpm build
pnpm start
```

Or use the launcher scripts:
- **Windows**: Double-click `start.bat`
- **macOS/Linux**: Run `./start.sh`

Open [http://localhost:4100](http://localhost:4100)

## 📁 Project Structure

```
questlog/
├── apps/
│   ├── server/          # Fastify backend API
│   │   ├── src/
│   │   │   ├── db/      # SQLite database
│   │   │   ├── routes/  # API endpoints
│   │   │   └── services/ # Business logic
│   │   └── ...
│   └── web/             # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── ...
│       └── ...
├── packages/
│   └── shared/          # Shared types, schemas, utils
└── ...
```

## 🛠️ Tech Stack

### Backend
- **Fastify** — Fast, low-overhead web framework
- **SQLite** (better-sqlite3) — Local database
- **Zod** — Schema validation
- **TypeScript** — Type safety

### Frontend
- **React 18** — UI library
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **React Hook Form** — Form handling

## 🎨 Themes

QuestLog comes with four beautiful themes:

| Theme | Description |
|-------|-------------|
| **Aurora** | Deep purple and violet gradients (default) |
| **Sunset** | Warm pink and coral tones |
| **Ocean** | Cool cyan and blue hues |
| **Midnight** | Minimal black with pastel accents |

## 📖 API Documentation

When running, access the Swagger UI at: [http://localhost:4100/api/docs](http://localhost:4100/api/docs)

## 🗄️ Data Storage

Data is stored locally in SQLite at platform-specific locations:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\QuestLog\questlog.db` |
| macOS | `~/Library/Application Support/QuestLog/questlog.db` |
| Linux | `~/.local/share/QuestLog/questlog.db` |

You can override with the `DB_PATH` environment variable.

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4100` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `DB_PATH` | (platform-specific) | Override database location |

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build for production |
| `pnpm start` | Run production server |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint code |
| `pnpm typecheck` | Check TypeScript |

## 🙏 Contributing

This is a personal productivity tool, but contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

Built with ❤️ for goal achievers everywhere. Level up your life, one check-in at a time! 🚀
