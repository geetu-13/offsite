require('dotenv').config();
const {client} = require('../connection');

const save = async (chunk) => {
    const database = client.db(process.env.DATABASE);
    const collection = database.collection(process.env.COLLECTION);
    return await collection.insertOne(chunk);
}

const fetchRelatedChunks = async (vector) => {
    // Need to implement vector search later;
}


module.exports = {save, fetchRelatedChunks}

