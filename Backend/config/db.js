// Database connection is handled by Supabase in api/auth.js.
// Kept as a compatibility no-op for local code and syntax checks.
async function connectDB() {
  return null;
}

module.exports = connectDB;
