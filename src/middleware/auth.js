const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Proteggi routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Controlla header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Controlla cookie (se implementato)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Assicurati che il token esista
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accesso negato. Token di autorizzazione richiesto.'
      });
    }

    try {
      // Verifica token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Trova utente corrente e controlla se è attivo
      const user = await User.findById(decoded.id).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token non valido. Utente non trovato.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account disattivato. Contattare l\'amministratore.'
        });
      }

      // Aggiungi utente alla request
      req.user = user;
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token scaduto. Effettuare nuovamente il login.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token non valido.'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
};

// Middleware opzionale (non blocca se non c'è token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token non valido, ma continuiamo senza errore
        console.log('Optional auth: invalid token');
      }
    }

    next();
  } catch (error) {
    next();
  }
};