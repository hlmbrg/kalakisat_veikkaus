const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BETS_FILE = path.join(__dirname, 'bets.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML/CSS/JS files from 'public' folder

// Initialize bets file if it doesn't exist
async function initializeBetsFile() {
  try {
    await fs.access(BETS_FILE);
  } catch {
    await fs.writeFile(BETS_FILE, JSON.stringify([]));
    console.log('Created bets.json file');
  }
}

// Get all bets
app.get('/api/bets', async (req, res) => {
  try {
    const data = await fs.readFile(BETS_FILE, 'utf8');
    const bets = JSON.parse(data);
    res.json(bets);
  } catch (error) {
    console.error('Error reading bets:', error);
    res.status(500).json({ error: 'Failed to load bets' });
  }
});

// Add a new bet
app.post('/api/bets', async (req, res) => {
  try {
    const newBet = req.body;
    
    // Validate required fields
    if (!newBet.veikkaaja || !newBet.voittaja || !newBet.pituus || !newBet.amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read existing bets
    const data = await fs.readFile(BETS_FILE, 'utf8');
    const bets = JSON.parse(data);
    
    // Add timestamp and ID if not provided
    if (!newBet.id) {
      newBet.id = 'bet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }
    if (!newBet.placedAt) {
      newBet.placedAt = new Date().toISOString();
    }
    
    // Add the new bet
    bets.push(newBet);
    
    // Save back to file
    await fs.writeFile(BETS_FILE, JSON.stringify(bets, null, 2));
    
    res.status(201).json(newBet);
  } catch (error) {
    console.error('Error saving bet:', error);
    res.status(500).json({ error: 'Failed to save bet' });
  }
});

// Delete a bet (optional)
app.delete('/api/bets/:id', async (req, res) => {
  try {
    const betId = req.params.id;
    
    const data = await fs.readFile(BETS_FILE, 'utf8');
    const bets = JSON.parse(data);
    
    const filteredBets = bets.filter(bet => bet.id !== betId);
    
    if (filteredBets.length === bets.length) {
      return res.status(404).json({ error: 'Bet not found' });
    }
    
    await fs.writeFile(BETS_FILE, JSON.stringify(filteredBets, null, 2));
    
    res.json({ message: 'Bet deleted successfully' });
  } catch (error) {
    console.error('Error deleting bet:', error);
    res.status(500).json({ error: 'Failed to delete bet' });
  }
});

// Start server
async function startServer() {
  await initializeBetsFile();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);