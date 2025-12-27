const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'betta_fish_game';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

module.exports = async function handler(req, res) {
  // 啟用 CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, gameData } = req.body;
    
    if (!playerId || !gameData) {
      return res.status(400).json({ error: 'Missing playerId or gameData' });
    }

    // 驗證 gameData 結構
    const validatedGameData = {
      fishes: gameData.fishes || [],
      money: gameData.money || 1000,
      food: gameData.food || 100, // 新增飼料欄位
      waterQuality: gameData.waterQuality || 100,
      temperature: gameData.temperature || 26
    };

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('saves');

    await collection.updateOne(
      { playerId },
      { 
        $set: { 
          gameData: validatedGameData,
          lastUpdated: new Date()
        } 
      },
      { upsert: true }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Game saved successfully',
      playerId 
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save game', details: error.message });
  }
};