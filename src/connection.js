require('dotenv').config();
const { MongoClient } = require('mongodb');
let client;

const init = async () => {
    if (client) return;
    const uri = process.env.MONGODB_URI; 
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MonogDB")
}

module.exports = {init, client};
