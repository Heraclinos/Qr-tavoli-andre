/**
 * Utility functions per il sistema QR Tavoli
 */

/**
 * Formatta una data in formato italiano
 * @param {Date} date - Data da formattare
 * @param {object} options - Opzioni di formattazione
 * @returns {string} - Data formattata
 */
function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return new Date(date).toLocaleDateString('it-IT', defaultOptions);
}

/**
 * Sanitizza una stringa rimuovendo caratteri potenzialmente pericolosi
 * @param {string} input - Stringa da sanitizzare
 * @returns {string} - Stringa sanitizzata
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Rimuovi script tags
    .replace(/<[^>]+>/g, '') // Rimuovi tutti gli HTML tags
    .replace(/[<>&"']/g, (char) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char] || char;
    });
}

/**
 * Genera un ID univoco
 * @param {number} length - Lunghezza dell'ID (default: 8)
 * @returns {string} - ID univoco
 */
function generateUniqueId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Valida un indirizzo email
 * @param {string} email - Email da validare
 * @returns {boolean} - True se email è valida
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calcola la posizione di un tavolo nella classifica
 * @param {number} points - Punti del tavolo
 * @param {Date} lastUpdate - Ultimo aggiornamento punti
 * @param {Array} allTables - Array di tutti i tavoli per confronto
 * @returns {number} - Posizione nella classifica
 */
function calculateTablePosition(points, lastUpdate, allTables) {
  let position = 1;

  for (const table of allTables) {
    if (table.points > points || 
        (table.points === points && table.lastPointsUpdate < lastUpdate)) {
      position++;
    }
  }

  return position;
}

/**
 * Ottieni emoji medaglia in base alla posizione
 * @param {number} position - Posizione nella classifica
 * @returns {string|null} - Emoji medaglia o null
 */
function getMedalEmoji(position) {
  const medals = ['🥇', '🥈', '🥉'];
  return position <= 3 ? medals[position - 1] : null;
}

/**
 * Formatta i punti con separatori delle migliaia
 * @param {number} points - Punti da formattare
 * @returns {string} - Punti formattati
 */
function formatPoints(points) {
  return new Intl.NumberFormat('it-IT').format(points);
}

/**
 * Calcola statistiche di base da un array di numeri
 * @param {Array<number>} numbers - Array di numeri
 * @returns {object} - Statistiche calcolate
 */
function calculateStats(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return {
      count: 0,
      sum: 0,
      average: 0,
      min: 0,
      max: 0,
      median: 0
    };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, num) => acc + num, 0);

  return {
    count: numbers.length,
    sum,
    average: sum / numbers.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  };
}

/**
 * Valida e normalizza il numero di tavolo
 * @param {any} tableNumber - Numero tavolo da validare
 * @returns {object} - Risultato validazione
 */
function validateTableNumber(tableNumber) {
  const num = parseInt(tableNumber);

  if (isNaN(num)) {
    return {
      valid: false,
      error: 'Numero tavolo deve essere un numero'
    };
  }

  if (num < 1 || num > 999) {
    return {
      valid: false,
      error: 'Numero tavolo deve essere tra 1 e 999'
    };
  }

  return {
    valid: true,
    value: num,
    formatted: `Tavolo ${num}`,
    qrCode: `TABLE_${num}`
  };
}

/**
 * Crea un oggetto di risposta API standardizzato
 * @param {boolean} success - Indica se l'operazione è riuscita
 * @param {string} message - Messaggio di risposta
 * @param {any} data - Dati di risposta
 * @param {object} meta - Metadati aggiuntivi
 * @returns {object} - Oggetto risposta standardizzato
 */
function createApiResponse(success, message, data = null, meta = {}) {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
}

/**
 * Converte millisecondi in formato leggibile
 * @param {number} ms - Millisecondi
 * @returns {string} - Tempo formattato
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} giorni`;
  } else if (hours > 0) {
    return `${hours} ore`;
  } else if (minutes > 0) {
    return `${minutes} minuti`;
  } else {
    return `${seconds} secondi`;
  }
}

/**
 * Verifica se una stringa è un MongoDB ObjectId valido
 * @param {string} id - ID da verificare
 * @returns {boolean} - True se è un ObjectId valido
 */
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Escape caratteri speciali per uso in regex
 * @param {string} string - Stringa da escape
 * @returns {string} - Stringa con caratteri escaped
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Genera un hash semplice da una stringa (per cache keys, etc.)
 * @param {string} str - Stringa da hashare
 * @returns {string} - Hash della stringa
 */
function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}

module.exports = {
  formatDate,
  sanitizeString,
  generateUniqueId,
  isValidEmail,
  calculateTablePosition,
  getMedalEmoji,
  formatPoints,
  calculateStats,
  validateTableNumber,
  createApiResponse,
  formatDuration,
  isValidObjectId,
  escapeRegExp,
  simpleHash
};