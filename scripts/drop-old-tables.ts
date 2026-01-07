import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function dropOldTables() {
  console.log("Dropping old tables...");

  try {
    // Drop old Auth.js tables (plural names)
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS accounts CASCADE`;
    await sql`DROP TABLE IF EXISTS verification_tokens CASCADE`;
    
    // Drop old app tables (plural names)
    await sql`DROP TABLE IF EXISTS posts CASCADE`;
    await sql`DROP TABLE IF EXISTS comments CASCADE`;
    await sql`DROP TABLE IF EXISTS likes CASCADE`;

    console.log("✓ Old tables dropped successfully");
  } catch (error) {
    console.error("Error dropping tables:", error);
  } finally {
    await sql.end();
  }
}

dropOldTables();
