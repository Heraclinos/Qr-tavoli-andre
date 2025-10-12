const mongoose = require('mongoose');

const PointTransactionSchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.ObjectId,
    ref: 'Table',
    required: [true, 'Tavolo richiesto']
  },
  assignedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Utente assegnatore richiesto']
  },
  points: {
    type: Number,
    required: [true, 'Punti richiesti'],
    min: [1, 'I punti devono essere almeno 1'],
    max: [1000, 'Troppi punti per una singola transazione']
  },
  type: {
    type: String,
    enum: {
      values: ['EARNED', 'REDEEMED', 'ADJUSTMENT', 'BONUS'],
      message: 'Tipo transazione non valido'
    },
    default: 'EARNED'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Descrizione non può superare i 200 caratteri'],
    default: 'Punti assegnati'
  },
  metadata: {
    previousPoints: {
      type: Number,
      required: true
    },
    newPoints: {
      type: Number,
      required: true
    },
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indici per performance e query
PointTransactionSchema.index({ table: 1, createdAt: -1 });
PointTransactionSchema.index({ assignedBy: 1, createdAt: -1 });
PointTransactionSchema.index({ type: 1 });
PointTransactionSchema.index({ createdAt: -1 });
PointTransactionSchema.index({ isActive: 1 });

// Virtual per calcolare differenza punti
PointTransactionSchema.virtual('pointsDifference').get(function() {
  return this.metadata.newPoints - this.metadata.previousPoints;
});

// Middleware pre-save per calcolare metadata
PointTransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.metadata.previousPoints) {
    try {
      const Table = mongoose.model('Table');
      const table = await Table.findById(this.table);

      if (table) {
        this.metadata.previousPoints = table.points - this.points;
        this.metadata.newPoints = table.points;
      }
    } catch (error) {
      console.error('Error calculating metadata:', error);
    }
  }
  next();
});

// Metodi statici
PointTransactionSchema.statics.getTableHistory = function(tableId, limit = 10) {
  return this.find({ table: tableId, isActive: true })
    .populate('assignedBy', 'username firstName lastName fullName')
    .populate('table', 'tableNumber name qrCode')
    .sort({ createdAt: -1 })
    .limit(limit);
};

PointTransactionSchema.statics.getUserActivity = function(userId, limit = 20) {
  return this.find({ assignedBy: userId, isActive: true })
    .populate('table', 'tableNumber name qrCode')
    .sort({ createdAt: -1 })
    .limit(limit);
};

PointTransactionSchema.statics.getDailyStats = function(date = new Date()) {
  const startDate = new Date(date.setHours(0, 0, 0, 0));
  const endDate = new Date(date.setHours(23, 59, 59, 999));

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$type',
        totalPoints: { $sum: '$points' },
        transactionCount: { $sum: 1 },
        avgPoints: { $avg: '$points' }
      }
    }
  ]);
};

module.exports = mongoose.model('PointTransaction', PointTransactionSchema);