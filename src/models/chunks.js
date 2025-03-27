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
    
    await client.connect();
    const database = client.db(process.env.DATABASE);
    const collection = database.collection(process.env.COLLECTION);
    
    console.log(vector);

    const pipeline = [
        {
            "$vectorSearch": {
              "exact": true,
              "index": "neural-nexus",
              "limit": 3,
            //   "numCandidates": 10,
              "path": "embeddings",
              "queryVector": vector
            }
        },
        {
            $project: {
                _id: 0,
                embeddings:0
            }
        }
    ]



    return await collection.aggregate(pipeline).toArray();
}


module.exports = {save, fetchRelatedChunks}

