const Table = require('../models/Table');
const PointTransaction = require('../models/PointTransaction');
const { generateQRCode } = require('../utils/qrGenerator');

// @desc    Ottieni tutte le tabelle attive
// @route   GET /api/tables
// @access  Public
exports.getTables = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const tables = await Table.find({ isActive: true })
      .sort({ points: -1, lastPointsUpdate: 1 })
      .skip(startIndex)
      .limit(limit)
      .select('tableNumber name qrCode points lastPointsUpdate location capacity');

    const total = await Table.countDocuments({ isActive: true });

    // Aggiungi posizioni e medaglie
    const tablesWithPosition = tables.map((table, index) => ({
      ...table.toObject(),
      position: startIndex + index + 1,
      medal: (startIndex + index) < 3 ? ['🥇', '🥈', '🥉'][startIndex + index] : null
    }));

    res.status(200).json({
      success: true,
      count: tablesWithPosition.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: tablesWithPosition
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero tavoli'
    });
  }
};

// @desc    Ottieni classifica tavoli
// @route   GET /api/tables/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res, next) => {
  try {
    const tables = await Table.getLeaderboard();

    // Aggiungi posizioni e medaglie
    const leaderboard = tables.map((table, index) => ({
      ...table.toObject(),
      position: index + 1,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      data: leaderboard,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero classifica'
    });
  }
};

// @desc    Trova tavolo tramite QR code
// @route   GET /api/tables/qr/:qrCode
// @access  Public
exports.getTableByQR = async (req, res, next) => {
  try {
    const { qrCode } = req.params;

    const table = await Table.findByQR(qrCode);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    // Calcola posizione nella classifica
    const position = await table.calculatePosition();

    const tableWithPosition = {
      ...table.toObject(),
      position,
      medal: position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : null
    };

    res.status(200).json({
      success: true,
      data: tableWithPosition
    });
  } catch (error) {
    console.error('Get table by QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella ricerca tavolo'
    });
  }
};

// @desc    Crea nuovo tavolo
// @route   POST /api/tables
// @access  Private (Admin/Cashier)
exports.createTable = async (req, res, next) => {
  try {
    const { tableNumber, name, location, capacity } = req.body;

    // Controlla se numero tavolo già esiste
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: `Tavolo numero ${tableNumber} già esistente`
      });
    }

    // Crea tavolo
    const tableData = {
      tableNumber,
      name: name || `Tavolo ${tableNumber}`,
      qrCode: `TABLE_${tableNumber}`,
      location,
      capacity,
      createdBy: req.user?.id
    };

    const table = await Table.create(tableData);

    // Genera QR Code image
    try {
      const qrCodeImage = await generateQRCode(
        `${process.env.FRONTEND_URL}/?table=${table.qrCode}`,
        { filename: `table-${tableNumber}.png` }
      );

      table.qrCodeImage = qrCodeImage;
      await table.save();
    } catch (qrError) {
      console.error('QR Code generation error:', qrError);
      // Continua anche se la generazione QR fallisce
    }

    res.status(201).json({
      success: true,
      message: 'Tavolo creato con successo',
      data: table
    });

  } catch (error) {
    console.error('Create table error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Numero tavolo già esistente'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Errore nella creazione tavolo'
    });
  }
};

// @desc    Aggiorna nome tavolo
// @route   PUT /api/tables/:id/name
// @access  Public (customers can change table name)
exports.updateTableName = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const table = await Table.findById(id);

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

    await table.updateName(name);

    res.status(200).json({
      success: true,
      message: 'Nome tavolo aggiornato con successo',
      data: {
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          name: table.name,
          qrCode: table.qrCode,
          points: table.points
        }
      }
    });
  } catch (error) {
    console.error('Update table name error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento nome'
    });
  }
};

// @desc    Ottieni singolo tavolo
// @route   GET /api/tables/:id
// @access  Public
exports.getTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    // Calcola posizione
    const position = await table.calculatePosition();

    // Ottieni storico transazioni recenti
    const recentTransactions = await PointTransaction.getTableHistory(table._id, 5);

    const tableWithExtras = {
      ...table.toObject(),
      position,
      medal: position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : null,
      recentTransactions
    };

    res.status(200).json({
      success: true,
      data: tableWithExtras
    });
  } catch (error) {
    console.error('Get single table error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero tavolo'
    });
  }
};

// @desc    Aggiorna tavolo
// @route   PUT /api/tables/:id
// @access  Private (Admin/Cashier)
exports.updateTable = async (req, res, next) => {
  try {
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    const allowedFields = ['name', 'location', 'capacity', 'isActive'];
    const updateData = {};

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    table = await Table.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Tavolo aggiornato con successo',
      data: table
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento tavolo'
    });
  }
};

// @desc    Elimina tavolo (soft delete)
// @route   DELETE /api/tables/:id
// @access  Private (Admin only)
exports.deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Tavolo non trovato'
      });
    }

    // Soft delete - disattiva invece di eliminare
    table.isActive = false;
    await table.save();

    res.status(200).json({
      success: true,
      message: 'Tavolo disattivato con successo'
    });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione tavolo'
    });
  }
};

// @desc    Ottieni statistiche tavoli
// @route   GET /api/tables/stats
// @access  Private (Admin/Cashier)
exports.getTableStats = async (req, res, next) => {
  try {
    const stats = await Table.getTableStats();

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalTables: 0,
        totalPoints: 0,
        averagePoints: 0,
        maxPoints: 0,
        minPoints: 0
      }
    });
  } catch (error) {
    console.error('Get table stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero statistiche'
    });
  }
};

// @desc    Reset punti di tutti i tavoli
// @route   POST /api/tables/reset-points
// @access  Private (Admin only)
exports.resetAllPoints = async (req, res, next) => {
  try {
    const result = await Table.updateMany(
      { isActive: true },
      { 
        $set: { 
          points: 0,
          lastPointsUpdate: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `Punti resettati per ${result.modifiedCount} tavoli`
    });
  } catch (error) {
    console.error('Reset points error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel reset punti'
    });
  }
};