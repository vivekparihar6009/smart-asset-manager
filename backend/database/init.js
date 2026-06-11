const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const initializeDatabase = async () => {
  try {
    console.log('Initializing database initialization process...');
    
    // Read schema.sql contents
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing DDL Schema scripts to reset and build database tables...');
    await db.query(schemaSql);
    
    console.log('Database schema bootstrapped and normalized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization process failed:', error);
    process.exit(1);
  }
};

initializeDatabase();
