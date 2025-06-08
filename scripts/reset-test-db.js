/**
 * Test Database Reset Script
 * This script resets the test database before running tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if .env.test exists
const envTestPath = path.join(__dirname, '..', '.env.test');
if (!fs.existsSync(envTestPath)) {
  console.error(
    '❌ .env.test file not found. Please create it with test database configuration.',
  );
  process.exit(1);
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Load .env.test variables
require('dotenv').config({ path: envTestPath });

const requiredEnvVars = ['DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required environment variables in .env.test: ${missingVars.join(', ')}`,
  );
  process.exit(1);
}

const dbHost = process.env.DATABASE_HOST || 'localhost';
const dbPort = process.env.DATABASE_PORT || '5432';
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
const dbName = process.env.DATABASE_NAME;

console.log(`🔄 Resetting test database: ${dbName}`);

try {
  // Drop and recreate the test database
  const psqlCommands = [
    `DROP DATABASE IF EXISTS "${dbName}";`,
    `CREATE DATABASE "${dbName}";`,
  ];

  psqlCommands.forEach((cmd) => {
    execSync(`psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -c "${cmd}"`, {
      env: { ...process.env, PGPASSWORD: dbPassword },
      stdio: 'inherit',
    });
  });

  console.log('✅ Test database reset completed successfully');
} catch (error) {
  console.error('❌ Failed to reset test database:', error.message);
  console.log('💡 Make sure PostgreSQL is running and credentials are correct');
  process.exit(1);
}
