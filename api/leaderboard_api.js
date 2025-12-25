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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('saves');

    // 取得前 10 名玩家 (以金錢排序)
    const leaderboard = await collection
      .find({})
      .sort({ 'gameData.money': -1 })
      .limit(10)
      .project({ 
        playerId: 1, 
        'gameData.money': 1,
        'gameData.fishes': 1,
        lastUpdated: 1 
      })
      .toArray();

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      playerId: entry.playerId,
      money: entry.gameData?.money || 0,
      fishCount: entry.gameData?.fishes?.length || 0,
      lastUpdated: entry.lastUpdated
    }));

    res.status(200).json({ 
      success: true,
      leaderboard: formattedLeaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load leaderboard', details: error.message });
  }
};