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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('saves');

    const save = await collection.findOne({ playerId });

    if (!save) {
      return res.status(404).json({ error: 'Save not found' });
    }

    // 確保舊存檔也有 food 欄位
    if (!save.gameData.food) {
      save.gameData.food = 100;
    }

    // 確保所有魚都有新的屬性
    if (save.gameData.fishes && save.gameData.fishes.length > 0) {
      save.gameData.fishes = save.gameData.fishes.map(fish => ({
        ...fish,
        age: fish.age || 0,
        growthStage: fish.growthStage || 'fry',
        hunger: fish.hunger !== undefined ? fish.hunger : 50
      }));
    }

    res.status(200).json({ 
      success: true,
      gameData: save.gameData,
      lastUpdated: save.lastUpdated
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load game', details: error.message });
  }
};