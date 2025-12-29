// Auto-initialize local database on server start
const { seedDummyData } = require('../scripts/seed-dummy-data');

async function initializeLocalDB() {
    if (process.env.USE_LOCAL_DB === 'true') {
        console.log('🔄 Initializing local database with dummy data...');
        try {
            await seedDummyData();
            console.log('✅ Local database initialized successfully!\n');
        } catch (error) {
            console.error('❌ Failed to initialize local database:', error.message);
        }
    }
}

module.exports = { initializeLocalDB };
