const { body, param, query, validationResult } = require('express-validator');
const config = require('../config/config');

// Middleware per gestire errori di validazione
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Errori di validazione',
      errors: formattedErrors
    });
  }

  next();
};

// Validazioni per autenticazione
exports.validateRegister = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username deve essere tra 3 e 20 caratteri')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username può contenere solo lettere, numeri, punti, trattini e underscore')
    .toLowerCase(),

  body('email')
    .isEmail()
    .withMessage('Inserire un indirizzo email valido')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve avere almeno 6 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password deve contenere almeno una lettera minuscola, una maiuscola e un numero'),

  body('firstName')
    .isLength({ min: 2, max: 30 })
    .withMessage('Nome deve essere tra 2 e 30 caratteri')
    .trim()
    .escape(),

  body('lastName')
    .isLength({ min: 2, max: 30 })
    .withMessage('Cognome deve essere tra 2 e 30 caratteri')
    .trim()
    .escape(),

  body('role')
    .optional()
    .isIn(Object.values(config.USER_ROLES))
    .withMessage('Ruolo non valido'),

  exports.handleValidationErrors
];

exports.validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username richiesto')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password richiesta'),

  exports.handleValidationErrors
];

// Validazioni per tavoli
exports.validateCreateTable = [
  body('tableNumber')
    .isInt({ min: 1, max: 999 })
    .withMessage('Numero tavolo deve essere tra 1 e 999'),

  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome tavolo deve essere tra 1 e 50 caratteri')
    .trim()
    .escape(),

  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Ubicazione non può superare i 100 caratteri')
    .trim()
    .escape(),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacità deve essere tra 1 e 20 persone'),

  exports.handleValidationErrors
];

exports.validateUpdateTableName = [
  param('id')
    .isMongoId()
    .withMessage('ID tavolo non valido'),

  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome tavolo deve essere tra 1 e 50 caratteri')
    .trim()
    .escape(),

  exports.handleValidationErrors
];

exports.validateTableQR = [
  param('qrCode')
    .matches(/^TABLE_\d+$/)
    .withMessage('Codice QR non valido. Formato: TABLE_[numero]')
    .toUpperCase(),

  exports.handleValidationErrors
];

// Validazioni per punti
exports.validateAddPoints = [
  body('qrCode')
    .matches(/^TABLE_\d+$/)
    .withMessage('Codice QR non valido. Formato: TABLE_[numero]')
    .toUpperCase(),

  body('points')
    .isInt({ min: config.MIN_POINTS_PER_TRANSACTION, max: config.MAX_POINTS_PER_TRANSACTION })
    .withMessage(`Punti devono essere tra ${config.MIN_POINTS_PER_TRANSACTION} e ${config.MAX_POINTS_PER_TRANSACTION}`),

  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Descrizione non può superare i 200 caratteri')
    .trim()
    .escape(),

  exports.handleValidationErrors
];

// Validazioni per query comuni
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pagina deve essere un numero positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: config.MAX_PAGE_SIZE })
    .withMessage(`Limite deve essere tra 1 e ${config.MAX_PAGE_SIZE}`),

  exports.handleValidationErrors
];

exports.validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage('ID non valido'),

  exports.handleValidationErrors
];