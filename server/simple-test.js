const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const ParimatchScraper = require('../scrapers/parimatch');
const XbetScraper = require('../scrapers/1xbet');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: { origin: "*" },
  pingTimeout: 60000
});

// Serve static files (your HTML frontend)
app.use(express.static('public'));

// Store latest odds
let latestOdds = [];
let arbitrageOpportunities = [];

// Scraper instances
const parimatch = new ParimatchScraper(null);
const xbet = new XbetScraper(null);

// Initialize scrapers
(async () => {
  await parimatch.init();
  await xbet.init();
  
  // Run initial scrape
  await runScrapers();
  
  // Scrape every 30 seconds
  setInterval(runScrapers, 30000);
})();

// Main scraping function
async function runScrapers() {
  try {
    console.log('\n=== Running Scrapers ===');
    const startTime = Date.now();
    
    // Run both scrapers in parallel
    const [pmData, xbData] = await Promise.allSettled([
      parimatch.scrapeCricket(),
      xbet.scrapeCricket()
    ]);

    const parimatchOdds = pmData.status === 'fulfilled' ? pmData.value : [];
    const xbetOdds = xbData.status === 'fulfilled' ? xbData.value : [];
    
    // Combine all odds
    latestOdds = [...parimatchOdds, ...xbetOdds];
    
    // Detect arbitrage opportunities
    arbitrageOpportunities = detectArbitrage(latestOdds);
    
    const duration = Date.now() - startTime;
    console.log(`Scraping completed in ${duration}ms`);
    console.log(`Total matches: ${latestOdds.length}`);
    console.log(`Arbitrage opportunities: ${arbitrageOpportunities.length}`);
    
    // Broadcast to all connected clients
    io.emit('odds_update', {
      timestamp: new Date().toISOString(),
      totalMatches: latestOdds.length,
      data: latestOdds,
      arbitrage: arbitrageOpportunities
    });
    
    // Special alert for arbitrage
    if (arbitrageOpportunities.length > 0) {
      io.emit('arbitrage_alert', arbitrageOpportunities);
    }
    
  } catch (error) {
    console.error('Scraper error:', error);
  }
}

// Arbitrage detection logic
function detectArbitrage(oddsData) {
  const opportunities = [];
  
  // Group by normalized event name
  const events = {};
  oddsData.forEach(item => {
    // Normalize: lowercase, remove extra spaces, handle common variations
    let key = item.event.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove common words that vary between bookmakers
    key = key.replace(/\b(cricket|t20|odi|test|match|game)\b/g, '').trim();
    
    if (!events[key]) events[key] = [];
    events[key].push(item);
  });

  // Check each event for arbitrage
  Object.keys(events).forEach(key => {
    const matches = events[key];
    if (matches.length < 2) return; // Need at least 2 bookmakers

    // Find best odds for each outcome across all bookmakers
    let bestHome = { odds: 0, bookmaker: '' };
    let bestAway = { odds: 0, bookmaker: '' };
    
    matches.forEach(match => {
      if (match.odds.home > bestHome.odds) {
        bestHome = { odds: match.odds.home, bookmaker: match.bookmaker };
      }
      if (match.odds.away > bestAway.odds) {
        bestAway = { odds: match.odds.away, bookmaker: match.bookmaker };
      }
    });

    // Calculate arbitrage percentage
    if (bestHome.odds > 0 && bestAway.odds > 0) {
      const margin = (1/bestHome.odds + 1/bestAway.odds) * 100;
      
      if (margin < 100) {
        const profitPercent = (100 - margin).toFixed(2);
        const stakes = calculateStakes(bestHome.odds, bestAway.odds, 10000);
        
        opportunities.push({
          event: matches[0].event,
          sport: matches[0].sport,
          profitPercent: profitPercent,
          margin: margin.toFixed(2),
          stakes: stakes,
          sources: {
            home: bestHome,
            away: bestAway
          },
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
}

function calculateStakes(oddsA, oddsB, totalStake) {
  const total = (1/oddsA) + (1/oddsB);
  const stakeA = (totalStake * (1/oddsA)) / total;
  const stakeB = (totalStake * (1/oddsB)) / total;
  const profit = (stakeA * oddsA) - totalStake;
  
  return {
    total: totalStake,
    a: Math.round(stakeA),
    b: Math.round(stakeB),
    profit: Math.round(profit),
    percentage: ((profit/totalStake) * 100).toFixed(2)
  };
}

// API Routes
app.get('/api/odds', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    count: latestOdds.length,
    data: latestOdds,
    arbitrage: arbitrageOpportunities
  });
});

app.get('/api/scrape', async (req, res) => {
  await runScrapers();
  res.json({ success: true, message: 'Scrape triggered manually' });
});

// Frontend route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current data immediately
  socket.emit('initial_data', {
    odds: latestOdds,
    arbitrage: arbitrageOpportunities
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}/`);
  console.log(`🔌 API: http://localhost:${PORT}/api/odds`);
  console.log(`⚡ Manual trigger: http://localhost:${PORT}/api/scrape\n`);
});