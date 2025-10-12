const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Numero tavolo richiesto'],
    unique: true,
    min: [1, 'Il numero del tavolo deve essere maggiore di 0'],
    max: [999, 'Numero tavolo troppo alto']
  },
  name: {
    type: String,
    required: [true, 'Nome tavolo richiesto'],
    trim: true,
    maxlength: [50, 'Il nome del tavolo non può superare i 50 caratteri'],
    default: function() { return `Tavolo ${this.tableNumber}`; }
  },
  qrCode: {
    type: String,
    required: [true, 'Codice QR richiesto'],
    unique: true,
    uppercase: true
  },
  qrCodeImage: {
    type: String, // Base64 o URL dell'immagine QR
    default: null
  },
  points: {
    type: Number,
    default: 0,
    min: [0, 'I punti non possono essere negativi']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastPointsUpdate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Ubicazione non può superare i 100 caratteri']
  },
  capacity: {
    type: Number,
    min: [1, 'Capacità deve essere almeno 1'],
    max: [20, 'Capacità massima 20 persone']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indici per performance
TableSchema.index({ points: -1, lastPointsUpdate: 1 }); // Per classifiche
TableSchema.index({ isActive: 1 });

// Virtual per formattazione QR code
TableSchema.virtual('formattedQR').get(function() {
  return `TABLE_${this.tableNumber}`;
});

// Middleware pre-save per generare QR code
TableSchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `TABLE_${this.tableNumber}`;
  }
  next();
});

// Metodi statici
TableSchema.statics.getLeaderboard = function() {
  return this.find({ isActive: true })
    .sort({ points: -1, lastPointsUpdate: 1 })
    .select('tableNumber name qrCode points lastPointsUpdate location capacity');
};

TableSchema.statics.findByQR = function(qrCode) {
  return this.findOne({ qrCode: qrCode.toUpperCase(), isActive: true });
};

TableSchema.statics.getTableStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalTables: { $sum: 1 },
        totalPoints: { $sum: '$points' },
        averagePoints: { $avg: '$points' },
        maxPoints: { $max: '$points' },
        minPoints: { $min: '$points' }
      }
    }
  ]);
};

// Metodi d'istanza
TableSchema.methods.addPoints = function(points, userId = null) {
  this.points += parseInt(points);
  this.lastPointsUpdate = new Date();
  return this.save();
};

TableSchema.methods.updateName = function(newName) {
  this.name = newName.trim();
  return this.save();
};

TableSchema.methods.calculatePosition = async function() {
  const betterTables = await this.constructor.countDocuments({
    isActive: true,
    $or: [
      { points: { $gt: this.points } },
      { 
        points: this.points,
        lastPointsUpdate: { $lt: this.lastPointsUpdate }
      }
    ]
  });

  return betterTables + 1;
};

module.exports = mongoose.model('Table', TableSchema);
