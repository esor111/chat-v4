const { Client } = require("pg");
require("dotenv").config();

// Configuration with proper type conversion and validation
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "chat_backend_new",
};

// Seed data - easier to maintain and extend
const SEED_USERS = [
  {
    id: "afc70db3-6f43-4882-92fd-4715f25ffc95",
    name: "Ishwor Gautam",
  },
  {
    id: "c5c3d135-4968-450b-9fca-57f01e0055f7",
    name: "Bhuwan Hamal",
  },
];

async function validateConnection(client) {
  try {
    await client.query("SELECT 1");
    console.log("✓ Database connection validated");
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function insertUsers(client, users) {
  const values = users
    .map((user) => `('${user.id}', NOW(), NOW())`)
    .join(",\n      ");

  const insertQuery = `
    INSERT INTO users (user_id, created_at, updated_at) 
    VALUES ${values}
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id;
  `;

  const result = await client.query(insertQuery);
  return result.rows;
}

async function verifyUsers(client, userIds) {
  const placeholders = userIds.map((_, index) => `$${index + 1}`).join(", ");
  const selectQuery = `
    SELECT user_id, created_at 
    FROM users 
    WHERE user_id IN (${placeholders})
    ORDER BY created_at;
  `;

  const result = await client.query(selectQuery, userIds);
  return result.rows;
}

async function seedUsers() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log("✓ Connected to database");

    await validateConnection(client);

    // Insert users
    const insertedUsers = await insertUsers(client, SEED_USERS);
    console.log(`✓ ${insertedUsers.length} users inserted/updated`);

    // Verify insertion
    const userIds = SEED_USERS.map((user) => user.id);
    const verifiedUsers = await verifyUsers(client, userIds);

    console.log("✓ Users verified in database:");
    verifiedUsers.forEach((user) => {
      console.log(`  - ${user.user_id} (created: ${user.created_at})`);
    });

    if (verifiedUsers.length !== SEED_USERS.length) {
      console.warn(
        `⚠ Warning: Expected ${SEED_USERS.length} users, found ${verifiedUsers.length}`
      );
    }
  } catch (error) {
    console.error("✗ Error seeding users:", error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log("✓ Database connection closed");
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

if (require.main === module) {
  seedUsers();
}

module.exports = { seedUsers, SEED_USERS };
