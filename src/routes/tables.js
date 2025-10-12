const express = require('express');
const {
  getTables,
  getLeaderboard,
  getTableByQR,
  createTable,
  getTable,
  updateTable,
  updateTableName,
  deleteTable,
  getTableStats,
  resetAllPoints
} = require('../controllers/tableController');

const { protect, optionalAuth } = require('../middleware/auth');
const { requireCashier, requireAdmin } = require('../middleware/roleCheck');
const {
  validateCreateTable,
  validateUpdateTableName,
  validateTableQR,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', validatePagination, getTables);
router.get('/leaderboard', getLeaderboard);
router.get('/qr/:qrCode', validateTableQR, getTableByQR);

// Routes with optional authentication
router.get('/:id', validateObjectId(), optionalAuth, getTable);

// Public route for customers to update table names
router.put('/:id/name', validateUpdateTableName, updateTableName);

// Protected routes (authentication required)
router.use(protect);

// Cashier and above routes
router.post('/', requireCashier, validateCreateTable, createTable);
router.put('/:id', requireCashier, validateObjectId(), updateTable);
router.get('/stats/summary', requireCashier, getTableStats);

// Admin only routes
router.delete('/:id', requireAdmin, validateObjectId(), deleteTable);
router.post('/reset-points', requireAdmin, resetAllPoints);

module.exports = router;