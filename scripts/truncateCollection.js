require('dotenv').config();
const { MongoClient } = require('mongodb');

async function truncateCollection() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DATABASE;
    const collectionName = process.env.COLLECTION;

    if (!uri || !dbName || !collectionName) {
        console.error('Missing required environment variables. Please check your .env file');
        console.error('Required variables: MONGODB_URI, DATABASE, COLLECTION');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected successfully');

        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Get count before truncation
        const countBefore = await collection.countDocuments();
        console.log(`Current document count: ${countBefore}`);

        // Truncate the collection
        console.log(`Truncating collection: ${collectionName}`);
        await collection.deleteMany({});
        
        // Verify count after truncation
        const countAfter = await collection.countDocuments();
        console.log(`Document count after truncation: ${countAfter}`);

        if (countAfter === 0) {
            console.log('Collection successfully truncated!');
        } else {
            console.warn('Warning: Collection may not have been fully truncated');
        }

    } catch (error) {
        console.error('Error truncating collection:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Database connection closed');
    }
}

// Run the script
truncateCollection(); 