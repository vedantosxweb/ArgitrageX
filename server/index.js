const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cron = require('node-cron');
const ParimatchScraper = require('../scrapers/parimatch');
const XbetScraper = require('../scrapers/1xbet');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Restrict this in production
    methods: ["GET", "POST"]
  }
});

// Redis for caching and pub/sub
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  retryDelayOnFailup: 100
});

// Scraper instances
const proxyConfig = {
  server: process.env.PROXY_SERVER, // e.g., 'http://proxy.soax.com:9000'
  username: process.env.PROXY_USER,
  password: process.env.PROXY_PASS
};

const parimatch = new ParimatchScraper(proxyConfig);
const xbet = new XbetScraper(proxyConfig);

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// REST API for current odds
app.get('/api/odds', async (req, res) => {
  try {
    const odds = await redis.get('current_odds');
    res.json(JSON.parse(odds) || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

// Arbitrage detection logic
function detectArbitrage(oddsData) {
  const opportunities = [];
  
  // Group by event name (normalized)
  const events = {};
  oddsData.forEach(item => {
    const key = item.event.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!events[key]) events[key] = [];
    events[key].push(item);
  });

  // Check for arbitrage across bookmakers
  Object.keys(events).forEach(key => {
    const matches = events[key];
    if (matches.length < 2) return;

    // Find best odds for each outcome across bookmakers
    const bestHome = Math.max(...matches.map(m => m.odds.home || 0));
    const bestAway = Math.max(...matches.map(m => m.odds.away || 0));
    
    const homeSource = matches.find(m => m.odds.home === bestHome);
    const awaySource = matches.find(m => m.odds.away === bestAway);

    if (bestHome > 0 && bestAway > 0) {
      const margin = (1/bestHome + 1/bestAway) * 100;
      
      if (margin < 100) {
        opportunities.push({
          event: matches[0].event,
          sport: matches[0].sport,
          profitPercent: (100 - margin).toFixed(2),
          stakes: calculateStakes(bestHome, bestAway, 10000),
          sources: {
            home: { bookmaker: homeSource.bookmaker, odds: bestHome },
            away: { bookmaker: awaySource.bookmaker, odds: bestAway }
          },
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  return opportunities;
}

function calculateStakes(oddsA, oddsB, totalStake) {
  const total = (1/oddsA) + (1/oddsB);
  const stakeA = (totalStake * (1/oddsA)) / total;
  const stakeB = (totalStake * (1/oddsB)) / total;
  return {
    total: totalStake,
    a: Math.round(stakeA),
    b: Math.round(stakeB),
    profit: Math.round((stakeA * oddsA) - totalStake)
  };
}

// Scraping scheduler (every 10 seconds for demo, adjust to 30s in production)
async function runScrapers() {
  console.log('Running scrapers...');
  
  try {
    // Run in parallel
    const [pmData, xbData] = await Promise.allSettled([
      parimatch.scrapeCricket(),
      xbet.scrapeViaAPI()
    ]);

    const allOdds = [
      ...(pmData.status === 'fulfilled' ? pmData.value : []),
      ...(xbData.status === 'fulfilled' ? xbData.value : [])
    ];

    if (allOdds.length > 0) {
      // Store in Redis with 60s TTL
      await redis.setex('current_odds', 60, JSON.stringify(allOdds));
      
      // Detect arbitrage
      const opportunities = detectArbitrage(allOdds);
      
      // Broadcast to all connected clients
      io.emit('odds_update', {
        timestamp: new Date().toISOString(),
        count: allOdds.length,
        data: allOdds,
        arbitrage: opportunities
      });

      if (opportunities.length > 0) {
        console.log(`🚨 Arbitrage detected: ${opportunities.length} opportunities`);
        io.emit('arbitrage_alert', opportunities);
      }
    }
  } catch (error) {
    console.error('Scraper error:', error);
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current odds immediately
  redis.get('current_odds').then(data => {
    if (data) socket.emit('initial_odds', JSON.parse(data));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start scrapers
(async () => {
  await parimatch.init();
  await xbet.init();
  
  // Initial run
  await runScrapers();
  
  // Schedule every 15 seconds (be nice to their servers)
  cron.schedule('*/15 * * * * *', runScrapers);
})();

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await parimatch.close();
  await xbet.close();
  await redis.disconnect();
  process.exit(0);
});