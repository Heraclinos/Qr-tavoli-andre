const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors
} = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Public routes
router.post('/login', validateLogin, login);

// Protected routes
router.use(protect); // Applica autenticazione a tutte le route seguenti

router.get('/me', getMe);
router.get('/logout', logout);

router.put('/updatedetails', [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Nome deve essere tra 2 e 30 caratteri')
    .trim()
    .escape(),

  body('lastName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Cognome deve essere tra 2 e 30 caratteri')
    .trim()
    .escape(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email non valida')
    .normalizeEmail(),

  handleValidationErrors
], updateDetails);

router.put('/updatepassword', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Password corrente richiesta'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nuova password deve avere almeno 6 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nuova password deve contenere almeno una lettera minuscola, una maiuscola e un numero'),

  handleValidationErrors
], updatePassword);

// Admin only routes
router.post('/register', requireAdmin, validateRegister, register);

module.exports = router;