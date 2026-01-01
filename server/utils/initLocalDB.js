// Auto-initialize local database on server start
// Dummy data seeding disabled - use production data or add manually

async function initializeLocalDB() {
    if (process.env.USE_LOCAL_DB === 'true') {
        console.log('🔧 Using LOCAL in-memory database (no dummy data seeded)');
        console.log('   Add data manually through the UI or set USE_LOCAL_DB=false for production data\n');
    }
}

module.exports = { initializeLocalDB };
