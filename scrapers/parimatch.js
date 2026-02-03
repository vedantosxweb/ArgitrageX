const BaseScraper = require('./base-scraper');

class ParimatchScraper extends BaseScraper {
  constructor(proxyConfig) {
    super('Parimatch', { proxy: proxyConfig });
    this.baseUrl = 'https://www.parimatch.com/in/en/sports/4';
  }

  async scrapeCricket() {
    if (!this.context) await this.init();
    
    const page = await this.context.newPage();
    
    try {
      console.log('Navigating to Parimatch Cricket...');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for the content to load
      await page.waitForTimeout(5000);

      // Extract matches using the working selector
      const matches = await page.$$eval('[data-testid*="event"]', events => 
        events.map(event => {
          const text = event.innerText;
          const lines = text.split('\n').filter(line => line.trim());
          
          // Parse the specific format we saw:
          // Line 0: Cricket. League Name
          // Line 1: TODAY, 14:30 (or date)
          // Line 2: Team A
          // Line 3: Team B  
          // Line 4: Odds 1 (e.g., 1.59)
          // Line 5: "1" (bet type)
          // Line 6: Odds 2 (e.g., 2.23)
          // Line 7: "2" (bet type)
          
          if (lines.length >= 6) {
            const league = lines[0].replace('Cricket. ', '').trim();
            const time = lines[1];
            const team1 = lines[2];
            const team2 = lines[3];
            const odds1 = parseFloat(lines[4]);
            const odds2 = parseFloat(lines[6]);
            
            // Validate we got numbers
            if (!isNaN(odds1) && !isNaN(odds2) && team1 && team2) {
              return {
                event: `${team1} vs ${team2}`,
                league: league,
                time: time,
                sport: 'cricket',
                bookmaker: 'parimatch',
                odds: {
                  home: odds1,
                  away: odds2,
                  draw: null // These appear to be head-to-head only
                },
                timestamp: new Date().toISOString()
              };
            }
          }
          return null;
        }).filter(Boolean)
      );

      await page.close();
      
      console.log(`Successfully extracted ${matches.length} matches from Parimatch`);
      
      // Log first few for debugging
      if (matches.length > 0) {
        console.log('First match:', JSON.stringify(matches[0], null, 2));
      }

      return matches;

    } catch (error) {
      console.error('Scrape error:', error);
      await page.close();
      return [];
    }
  }
}

module.exports = ParimatchScraper;