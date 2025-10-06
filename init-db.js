// Database initialization script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();
        
        console.log('📖 Reading schema file...');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔨 Creating tables...');
        await client.query(schema);
        
        console.log('✅ Database initialized successfully!');
        
        // Check tables
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('\n📊 Created tables:');
        result.rows.forEach(row => {
            console.log('  -', row.table_name);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        process.exit(1);
    }
}

initDatabase();
