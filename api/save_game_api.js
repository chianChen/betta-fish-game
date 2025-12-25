const { MongoClient } = require('mongodb');

// MongoDB 連接字串 (從環境變數讀取)
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

module.exports = async (req, res) => {
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

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('saves');

    // 更新或插入遊戲資料
    const result = await collection.updateOne(
      { playerId },
      { 
        $set: { 
          gameData,
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