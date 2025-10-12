const Table = require('../models/Table');
const PointTransaction = require('../models/PointTransaction');
const config = require('../config/config');

// @desc    Aggiungi punti al tavolo
// @route   POST /api/points/add
// @access  Private (Cashier/Admin)
exports.addPoints = async (req, res, next) => {
  try {
    const { qrCode, points, description } = req.body;

    // Trova tavolo tramite QR code
    const table = await Table.findByQR(qrCode);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    if (!table.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Tavolo non attivo'
      });
    }

    const pointsToAdd = parseInt(points);

    // Validazioni aggiuntive
    if (pointsToAdd < config.MIN_POINTS_PER_TRANSACTION || 
        pointsToAdd > config.MAX_POINTS_PER_TRANSACTION) {
      return res.status(400).json({
        success: false,
        message: `Punti devono essere tra ${config.MIN_POINTS_PER_TRANSACTION} e ${config.MAX_POINTS_PER_TRANSACTION}`
      });
    }

    // Salva punti precedenti per la transazione
    const previousPoints = table.points;

    // Aggiungi punti al tavolo
    await table.addPoints(pointsToAdd);

    // Crea transazione
    const transaction = await PointTransaction.create({
      table: table._id,
      assignedBy: req.user.id,
      points: pointsToAdd,
      type: 'EARNED',
      description: description || 'Punti assegnati dal cassiere',
      metadata: {
        previousPoints,
        newPoints: table.points,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Popola i dati per la risposta
    await transaction.populate([
      { path: 'table', select: 'tableNumber name qrCode points' },
      { path: 'assignedBy', select: 'username fullName role' }
    ]);

    res.status(200).json({
      success: true,
      message: `${pointsToAdd} punti aggiunti a ${table.name}`,
      data: {
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          name: table.name,
          qrCode: table.qrCode,
          points: table.points,
          previousPoints
        },
        transaction: {
          id: transaction._id,
          points: transaction.points,
          type: transaction.type,
          description: transaction.description,
          timestamp: transaction.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Add points error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta punti'
    });
  }
};

// @desc    Ottieni transazioni punti
// @route   GET /api/points/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Filtri opzionali
    const filter = { isActive: true };

    if (req.query.table) {
      filter.table = req.query.table;
    }

    if (req.query.assignedBy) {
      filter.assignedBy = req.query.assignedBy;
    }

    if (req.query.type) {
      filter.type = req.query.type.toUpperCase();
    }

    // Query con popolazione
    const transactions = await PointTransaction.find(filter)
      .populate('table', 'tableNumber name qrCode')
      .populate('assignedBy', 'username fullName role')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await PointTransaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: transactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero transazioni'
    });
  }
};

// @desc    Ottieni storico punti di un tavolo
// @route   GET /api/points/table/:tableId/history
// @access  Public
exports.getTableHistory = async (req, res, next) => {
  try {
    const { tableId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Verifica che il tavolo esista
    const table = await Table.findById(tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    const transactions = await PointTransaction.getTableHistory(tableId, limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: {
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          name: table.name,
          currentPoints: table.points
        },
        transactions
      }
    });

  } catch (error) {
    console.error('Get table history error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero storico tavolo'
    });
  }
};

// @desc    Ottieni attività utente
// @route   GET /api/points/user/:userId/activity
// @access  Private (own activity or admin)
exports.getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Controlla autorizzazione - solo admin o propria attività
    if (req.user.role !== config.USER_ROLES.ADMIN && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a visualizzare questa attività'
      });
    }

    const transactions = await PointTransaction.getUserActivity(userId, limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero attività utente'
    });
  }
};

// @desc    Ottieni statistiche punti giornaliere
// @route   GET /api/points/stats/daily
// @access  Private (Admin/Cashier)
exports.getDailyStats = async (req, res, next) => {
  try {
    let date = new Date();

    if (req.query.date) {
      date = new Date(req.query.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Formato data non valido'
        });
      }
    }

    const stats = await PointTransaction.getDailyStats(date);

    // Calcola totali
    const summary = {
      date: date.toISOString().split('T')[0],
      totalPoints: 0,
      totalTransactions: 0,
      averagePoints: 0,
      typeBreakdown: {}
    };

    stats.forEach(stat => {
      summary.totalPoints += stat.totalPoints;
      summary.totalTransactions += stat.transactionCount;
      summary.typeBreakdown[stat._id] = {
        points: stat.totalPoints,
        transactions: stat.transactionCount,
        average: stat.avgPoints
      };
    });

    summary.averagePoints = summary.totalTransactions > 0 
      ? (summary.totalPoints / summary.totalTransactions).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary,
        detailed: stats
      }
    });

  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero statistiche giornaliere'
    });
  }
};

// @desc    Riscatta punti (future feature)
// @route   POST /api/points/redeem
// @access  Private
exports.redeemPoints = async (req, res, next) => {
  try {
    const { qrCode, points, description } = req.body;

    const table = await Table.findByQR(qrCode);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    if (table.points < points) {
      return res.status(400).json({
        success: false,
        message: 'Punti insufficienti per il riscatto'
      });
    }

    const previousPoints = table.points;

    // Sottrai punti
    table.points -= parseInt(points);
    table.lastPointsUpdate = new Date();
    await table.save();

    // Crea transazione di riscatto
    const transaction = await PointTransaction.create({
      table: table._id,
      assignedBy: req.user.id,
      points: parseInt(points),
      type: 'REDEEMED',
      description: description || 'Punti riscattati',
      metadata: {
        previousPoints,
        newPoints: table.points,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(200).json({
      success: true,
      message: `${points} punti riscattati da ${table.name}`,
      data: {
        table: {
          id: table._id,
          name: table.name,
          points: table.points,
          previousPoints
        },
        transaction
      }
    });

  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel riscatto punti'
    });
  }
};

// @desc    Elimina transazione (soft delete)
// @route   DELETE /api/points/transactions/:id
// @access  Private (Admin only)
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await PointTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transazione non trovata'
      });
    }

    transaction.isActive = false;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transazione eliminata'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione transazione'
    });
  }
};