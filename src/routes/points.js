const express = require('express');
const {
  addPoints,
  getTransactions,
  getTableHistory,
  getUserActivity,
  getDailyStats,
  redeemPoints,
  deleteTransaction
} = require('../controllers/pointsController');

const { protect, optionalAuth } = require('../middleware/auth');
const { requireCashier, requireAdmin } = require('../middleware/roleCheck');
const {
  validateAddPoints,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');
const { param, query } = require('express-validator');

const router = express.Router();

// Public routes
router.get('/table/:tableId/history', [
  param('tableId').isMongoId().withMessage('ID tavolo non valido'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve essere tra 1 e 50'),
], getTableHistory);

// Protected routes (authentication required)
router.use(protect);

// Cashier and above routes
router.post('/add', requireCashier, validateAddPoints, addPoints);
router.post('/redeem', requireCashier, [
  validateAddPoints, // Usa la stessa validazione per consistenza
], redeemPoints);

router.get('/transactions', requireCashier, [
  validatePagination,
  query('table').optional().isMongoId().withMessage('ID tavolo non valido'),
  query('assignedBy').optional().isMongoId().withMessage('ID utente non valido'),
  query('type').optional().isIn(['EARNED', 'REDEEMED', 'ADJUSTMENT', 'BONUS']).withMessage('Tipo transazione non valido'),
], getTransactions);

router.get('/stats/daily', requireCashier, [
  query('date').optional().isISO8601().withMessage('Formato data non valido (YYYY-MM-DD)'),
], getDailyStats);

router.get('/user/:userId/activity', [
  param('userId').isMongoId().withMessage('ID utente non valido'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
], getUserActivity);

// Admin only routes
router.delete('/transactions/:id', requireAdmin, validateObjectId(), deleteTransaction);

module.exports = router;