require('dotenv').config();
const { MongoClient } = require('mongodb');

// const {client} = require('../connection');
// if (client) return;
const uri = process.env.MONGODB_URI; 
client = new MongoClient(uri);
// console.log("Connected to MonogDB")

const save = async (chunk) => {
    await client.connect();
    const database = client.db(process.env.DATABASE);
    const collection = database.collection(process.env.COLLECTION);
    return await collection.insertOne(chunk);
}

const fetchRelatedChunks = async (vector) => {
    // Need to implement vector search later;
}


module.exports = {save, fetchRelatedChunks}

