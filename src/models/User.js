const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username richiesto'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username deve avere almeno 3 caratteri'],
    maxlength: [20, 'Username non può superare i 20 caratteri'],
    match: [/^[a-zA-Z0-9._-]+$/, 'Username può contenere solo lettere, numeri, punti, trattini e underscore']
  },
  email: {
    type: String,
    required: [true, 'Email richiesta'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Inserire un indirizzo email valido'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password richiesta'],
    minlength: [6, 'Password deve avere almeno 6 caratteri'],
    select: false // Non inclusa nelle query di default
  },
  role: {
    type: String,
    enum: {
      values: Object.values(config.USER_ROLES),
      message: 'Ruolo non valido'
    },
    default: config.USER_ROLES.CASHIER
  },
  firstName: {
    type: String,
    required: [true, 'Nome richiesto'],
    trim: true,
    maxlength: [30, 'Nome non può superare i 30 caratteri']
  },
  lastName: {
    type: String,
    required: [true, 'Cognome richiesto'],
    trim: true,
    maxlength: [30, 'Cognome non può superare i 30 caratteri']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indici
UserSchema.index({ role: 1 });

// Virtual per nome completo
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Encrypt password usando bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT e return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      username: this.username
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

// Match password utente inserita con quella hashata nel database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static methods
UserSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', UserSchema);
