<p align="center">
  <img src="https://img.shields.io/badge/ArbitrageX-v1.0.0-purple?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTMgN0gxbTAgMGwxMiAxMm0wIDBoLTEybTAgMGwxMi0xMm0tMTAgMmgxMG0tMTAgMTBoMTAiLz48L3N2Zz4=" alt="Logo"/>
  <br>
  <strong style="font-size: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ArbitrageX</strong>
  <br>
  <em>Real-time sports arbitrage detection engine</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Playwright-1.40-2EAD33?style=flat-square&logo=playwright"/>
  <img src="https://img.shields.io/badge/Socket.io-4.5-black?style=flat-square&logo=socket.io"/>
  <img src="https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat-square&logo=tailwind-css"/>
  <br>
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"/>
</p>

<p align="center">
  <a href="#what-is-arbitragex">About</a> •
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

## What is ArbitrageX?

ArbitrageX scans multiple sports bookmakers in real-time to find **arbitrage opportunities** — situations where you can bet on all outcomes and guarantee a profit regardless of the result.

> **Example**: If Parimatch offers 2.20 on Pakistan and 1xBet offers 2.10 on Australia, you can bet on both and lock in 3-5% profit risk-free.

---

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| Real-time Scraping | Live odds from Parimatch & 1xBet every 30s | ✅ Active |
| Arbitrage Calculator | Auto-calculates optimal stakes & guaranteed profit | ✅ Active |
| Instant Alerts | Browser notifications when >2% profit detected | ✅ Active |
| Live Dashboard | WebSocket-powered, no refresh needed | ✅ Active |
| Multi-sport | Cricket, Football, Tennis support | 🚧 Expanding |
| Auto-bet | API integration for automated placement | 📅 Planned |

---

## Demo

**Real-time odds feed with arbitrage detection**

### Key Screens:
- **Live Odds Table** — Auto-updating every 30 seconds
- **Arbitrage Alerts** — Green banners when opportunities detected
- **Quick Calculator** — Click any match to auto-fill odds
- **Stake Distribution** — Exact rupee amounts to bet on each outcome

---

## Quick Start

### Prerequisites

```bash
# macOS
brew install node redis

# Ubuntu/Debian
sudo apt install nodejs redis-server

# Windows
# Download from https://nodejs.org and https://redis.io
```

### Installation

```bash
# Clone repo
git clone https://github.com/yourusername/arbitragex.git
cd arbitragex

# Install dependencies
npm install

# Install Playwright browsers (Chromium)
npx playwright install chromium

# Start Redis (optional, uses memory store if unavailable)
redis-server

# Launch application
npm start
```

**Open http://localhost:3001**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  WebSocket  ┌──────────────────────────┐ │
│  │   Browser    │◄────────────►│   React + Tailwind UI    │ │
│  │  Dashboard   │              │   Real-time Updates      │ │
│  └──────────────┘              └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVER LAYER                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Node.js + Express + Socket.io                         │ │
│  │  • Odds aggregation  • Arbitrage math  • Broadcast     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Parimatch     │  │     1xBet       │  │    Redis     │
│    Scraper      │  │    Scraper      │  │    Cache     │
│  (5s latency)   │  │  (10s latency)  │  │   (TTL 60s)  │
└─────────────────┘  └─────────────────┘  └──────────────┘
```

### Tech Stack:
- **Runtime**: Node.js 18+
- **Browser Automation**: Playwright with stealth plugins
- **Real-time**: Socket.io for bidirectional events
- **Styling**: Tailwind CSS with glassmorphism design
- **Storage**: Redis (optional) / In-memory fallback

---

## Configuration

Create `.env` in project root:

```env
# Server
PORT=3001
NODE_ENV=development

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Proxies (recommended for production)
PROXY_SERVER=http://user:pass@host:port
PROXY_USER=username
PROXY_PASS=password

# Scraping
SCRAPE_INTERVAL=30000
MAX_RETRIES=3
```

---

## Project Structure

```
arbitragex/
├── scrapers/          # Bookmaker-specific scrapers
│   ├── base-scraper.js   # Anti-detection base class
│   ├── parimatch.js      # Parimatch implementation
│   └── 1xbet.js          # 1xBet implementation
│
├── server/            # Backend API
│   ├── simple-test.js    # Development server
│   └── index.js          # Production server
│
├── public/            # Frontend assets
│   └── index.html        # Main dashboard
│
├── utils/
│   └── logger.js         # Logging utility
│
├── docker-compose.yml    # Container orchestration
├── package.json
└── README.md
```

---

## The Math

Arbitrage exists when:

```
1/OddsA + 1/OddsB < 1
```

### Example Calculation:

| Bookmaker | Team A | Team B |
|-----------|--------|--------|
| Parimatch | 2.20   | 1.67   |
| 1xBet     | 1.95   | 2.05   |

**Best combination**: 2.20 (Parimatch) + 2.05 (1xBet)

```
1/2.20 + 1/2.05 = 0.454 + 0.487 = 0.941 = 94.1%
Profit = 100% - 94.1% = 5.9%
```

**Optimal stakes for ₹10,000**:
- Bet **₹4,773** on Team A @ 2.20 (Parimatch)
- Bet **₹5,227** on Team B @ 2.05 (1xBet)
- **Guaranteed profit**: ₹590 regardless of outcome

---

## Roadmap

- [x] Parimatch scraper
- [x] 1xBet scraper (beta)
- [x] Real-time WebSocket updates
- [x] Arbitrage calculator
- [ ] Betwinner integration
- [ ] Telegram bot alerts
- [ ] Historical odds database
- [ ] Machine learning for odds prediction
- [ ] Mobile app (React Native)

---

## Important Notes

### Current Limitations:
- 1xBet scraping requires residential proxies for consistent results
- Some matches may show 0.00 odds (in-play markets)
- Scraping breaks if bookmakers change site structure

### Legal:
- Tool is for **educational use only**
- Users must comply with local gambling laws
- Bookmaker ToS prohibit automated access
- Authors not liable for account restrictions or losses

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 0 matches found | Check selectors, increase wait timeouts |
| WebSocket disconnected | Ensure server running, check port 3001 |
| 1xBet empty | Normal without proxies; use manual comparison |
| High memory usage | Reduce SCRAPE_INTERVAL, restart periodically |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ⚡ for the Indian betting community
  <br>
  <sub>Not affiliated with any bookmaker. Gamble responsibly.</sub>
</p>
