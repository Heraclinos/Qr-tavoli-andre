const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

/**
 * Genera un QR code per il tavolo
 * @param {string} data - URL o dati da codificare nel QR
 * @param {object} options - Opzioni per la generazione
 * @returns {Promise<string>} - Base64 string dell'immagine QR o percorso file
 */
async function generateQRCode(data, options = {}) {
  try {
    const qrOptions = {
      ...config.QR_OPTIONS,
      ...options
    };

    // Se è specificato un filename, salva su file
    if (options.filename) {
      const outputDir = path.join(process.cwd(), 'qr-codes');

      // Crea directory se non esiste
      try {
        await fs.access(outputDir);
      } catch (error) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, options.filename);
      await QRCode.toFile(filePath, data, qrOptions);

      return filePath;
    }

    // Altrimenti ritorna base64
    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
    return qrCodeDataURL;

  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Errore nella generazione del codice QR');
  }
}

/**
 * Genera QR codes per tutti i tavoli in batch
 * @param {Array} tables - Array di oggetti tavolo
 * @param {string} baseUrl - URL base del frontend
 * @returns {Promise<Object>} - Risultati della generazione batch
 */
async function generateBatchQRCodes(tables, baseUrl) {
  const results = {
    success: [],
    failed: [],
    total: tables.length
  };

  for (const table of tables) {
    try {
      const qrData = `${baseUrl}/?table=${table.qrCode}`;
      const filename = `table-${table.tableNumber}.png`;

      const filePath = await generateQRCode(qrData, { filename });

      results.success.push({
        tableId: table._id,
        tableNumber: table.tableNumber,
        qrCode: table.qrCode,
        filePath,
        url: qrData
      });

    } catch (error) {
      results.failed.push({
        tableId: table._id,
        tableNumber: table.tableNumber,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Genera template HTML per stampare i QR codes
 * @param {Array} qrCodes - Array con i dati dei QR codes generati
 * @param {object} templateOptions - Opzioni per il template
 * @returns {string} - HTML template per la stampa
 */
function generatePrintTemplate(qrCodes, templateOptions = {}) {
  const options = {
    title: 'QR Codes Tavoli - Ristorante',
    restaurantName: 'Il Mio Ristorante',
    instructions: 'Scansiona il QR code per visualizzare la classifica punti',
    codesPerRow: 3,
    ...templateOptions
  };

  let html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        @page {
            margin: 1cm;
            size: A4;
        }

        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }

        .header h1 {
            margin: 0;
            color: #333;
            font-size: 24px;
        }

        .qr-grid {
            display: grid;
            grid-template-columns: repeat(${options.codesPerRow}, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .qr-card {
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            background: #fafafa;
            break-inside: avoid;
        }

        .qr-card h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 18px;
            font-weight: bold;
        }

        .qr-code {
            margin: 15px 0;
        }

        .qr-code img {
            width: 150px;
            height: 150px;
            border: 1px solid #ddd;
        }

        .instructions {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
            line-height: 1.4;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }

        @media print {
            body { 
                background: white; 
            }

            .qr-card {
                background: white !important;
                border: 2px solid #333 !important;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ ${options.restaurantName}</h1>
        <p>Codici QR Tavoli - Sistema Punti Fedeltà</p>
    </div>

    <div class="qr-grid">
`;

  qrCodes.forEach(qr => {
    html += `
        <div class="qr-card">
            <h3>${qr.tableName || `Tavolo ${qr.tableNumber}`}</h3>
            <div class="qr-code">
                <img src="${qr.qrCodeDataURL || ''}" alt="QR Code ${qr.tableNumber}" />
            </div>
            <div class="instructions">
                ${options.instructions}
            </div>
        </div>
    `;
  });

  html += `
    </div>

    <div class="footer">
        <p>Generato il ${new Date().toLocaleDateString('it-IT')} - ${options.restaurantName}</p>
        <p>Sistema QR Tavoli v1.0</p>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Valida e formatta il QR code data
 * @param {string} qrCode - Codice QR da validare
 * @returns {object} - Oggetto con validazione e dati formattati
 */
function validateQRCode(qrCode) {
  const qrPattern = /^TABLE_(\d+)$/i;
  const match = qrCode.toUpperCase().match(qrPattern);

  if (!match) {
    return {
      valid: false,
      error: 'Formato QR code non valido. Deve essere TABLE_[numero]'
    };
  }

  const tableNumber = parseInt(match[1]);

  if (tableNumber < 1 || tableNumber > 999) {
    return {
      valid: false,
      error: 'Numero tavolo deve essere tra 1 e 999'
    };
  }

  return {
    valid: true,
    tableNumber,
    qrCode: qrCode.toUpperCase(),
    formatted: `TABLE_${tableNumber}`
  };
}

/**
 * Genera URL del frontend per il QR code
 * @param {string} qrCode - Codice QR del tavolo
 * @param {string} baseUrl - URL base del frontend
 * @returns {string} - URL completo per il QR code
 */
function generateTableURL(qrCode, baseUrl = process.env.FRONTEND_URL) {
  const validation = validateQRCode(qrCode);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return `${baseUrl}/?table=${validation.formatted}`;
}

module.exports = {
  generateQRCode,
  generateBatchQRCodes,
  generatePrintTemplate,
  validateQRCode,
  generateTableURL
};