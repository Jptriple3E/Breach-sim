// Uses Postgres when DATABASE_URL is set (production/serverless-friendly),
// otherwise falls back to a local SQLite file (zero-config local dev).
const usePostgres = !!process.env.DATABASE_URL;

module.exports = usePostgres ? require('./postgres') : require('./sqlite');
