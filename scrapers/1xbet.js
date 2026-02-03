const BaseScraper = require('./base-scraper');

class XbetScraper extends BaseScraper {
  constructor(proxyConfig) {
    super('1xBet', { proxy: proxyConfig });
    this.baseUrl = 'https://1xbet.com/en/line/cricket/';
  }

  async scrapeCricket() {
    if (!this.context) await this.init();
    
    const page = await this.context.newPage();
    
    try {
      console.log('Navigating to 1xBet Cricket...');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      await page.waitForTimeout(8000);

      // 1xBet loads content dynamically - we need to scroll or wait for specific selectors
      // Try to find match containers
      const matches = await page.$$eval('.c-events__item, [class*="event"], [class*="Event"]', events => 
        events.map(event => {
          try {
            const text = event.innerText;
            const lines = text.split('\n').filter(line => line.trim());
            
            // Look for odds pattern (decimal numbers like 1.85, 2.10)
            const oddsMatches = text.match(/\d+\.\d{2}/g);
            
            if (oddsMatches && oddsMatches.length >= 2) {
              // Try to find team names (usually before the odds)
              const teams = [];
              const oddValues = oddsMatches.map(o => parseFloat(o));
              
              // Heuristic: Find text lines that look like team names (not numbers, not odds)
              lines.forEach(line => {
                if (!line.match(/^\d+\.\d+$/) && 
                    !line.match(/^\d+$/) && 
                    line.length > 2 && 
                    line.length < 50 &&
                    !line.includes('Live') &&
                    !line.includes('BET')) {
                  teams.push(line);
                }
              });
              
              if (teams.length >= 2) {
                return {
                  event: `${teams[0]} vs ${teams[1]}`,
                  sport: 'cricket',
                  bookmaker: '1xbet',
                  odds: {
                    home: oddValues[0],
                    away: oddValues[1],
                    draw: oddValues[2] || null
                  },
                  timestamp: new Date().toISOString()
                };
              }
            }
            return null;
          } catch (e) {
            return null;
          }
        }).filter(Boolean)
      );

      await page.close();
      
      console.log(`Successfully extracted ${matches.length} matches from 1xBet`);
      return matches;

    } catch (error) {
      console.error('1xBet scrape error:', error);
      await page.close();
      return [];
    }
  }
}

module.exports = XbetScraper;