module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 24,

  // QR Code configuration
  QR_CODE_PREFIX: 'TABLE_',
  QR_OPTIONS: {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 300
  },

  // Points system
  MAX_POINTS_PER_TRANSACTION: parseInt(process.env.MAX_POINTS_PER_TRANSACTION) || 100,
  MIN_POINTS_PER_TRANSACTION: 1,

  // Tables configuration
  MAX_TABLES: 50,
  DEFAULT_TABLE_POINTS: 0,

  // User roles
  USER_ROLES: {
    CUSTOMER: 'customer',
    CASHIER: 'cashier',
    ADMIN: 'admin'
  },

  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100 // max richieste per IP
  },

  // Security
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};