require('dotenv').config();
const {client} = require('../connection');
const database = client.db(process.env.DATABASE);
const collection = database.collection(process.env.COLLECTION);


const save = async (chunk) => {
    return await collection.insertOne(chunk);
}

const fetchRelatedChunks = async (vector) => {
    // Need to implement vector search later;
}


module.exports = {save, fetchRelatedChunks}

