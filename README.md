# QR Tavoli Backend

Backend API completo per sistema QR punti tavoli con autenticazione JWT, sicurezza avanzata e generazione automatica di QR codes.

## 🚀 Caratteristiche

- **🔐 Autenticazione JWT** con hash password bcrypt
- **🛡️ Sicurezza Avanzata** (Rate limiting, Helmet, CORS, Anti-XSS)
- **📊 Sistema Punti** completo con tracking transazioni
- **🎯 QR Code Generator** automatico per tavoli
- **📱 API REST** completamente documentata
- **🗄️ MongoDB** con Mongoose ODM
- **⚡ Performance** ottimizzate con indici e aggregazioni
- **🧪 Testing Ready** con Jest e Supertest

## 📁 Struttura Progetto

```
qr-tavoli-backend/
├── src/
│   ├── config/          # Configurazioni database e app
│   ├── controllers/     # Logic controllers per API
│   ├── middleware/      # Auth, validation, security middleware
│   ├── models/          # Mongoose models (User, Table, PointTransaction)
│   ├── routes/          # Route definitions
│   ├── utils/           # Utility functions e QR generator
│   └── app.js          # Express app configuration
├── scripts/            # Database seeding scripts
├── server.js           # Entry point
├── package.json
└── README.md
```

## ⚡ Quick Start

### 1. Clone e Setup

```bash
git clone <repository-url>
cd qr-tavoli-backend
npm install
```

### 2. Environment Variables

Crea file `.env`:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/qr-tavoli?retryWrites=true&w=majority

# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=24h

# Frontend URL per CORS
FRONTEND_URL=https://your-frontend.onrender.com

# Security
BCRYPT_SALT_ROUNDS=12
MAX_POINTS_PER_TRANSACTION=100
```

### 3. Database Setup

Popola il database con dati di esempio:

```bash
npm run seed
```

### 4. Avvia Server

```bash
# Production
npm start

# Development con nodemon
npm run dev
```

## 📋 API Endpoints

### 🔐 Authentication (`/api/auth`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/login` | Login utente | ❌ |
| POST | `/register` | Registra utente | 👑 Admin |
| GET | `/me` | Profilo utente corrente | ✅ |
| PUT | `/updatedetails` | Aggiorna profilo | ✅ |
| PUT | `/updatepassword` | Cambia password | ✅ |
| GET | `/logout` | Logout | ✅ |

### 🪑 Tables (`/api/tables`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/` | Lista tavoli con paginazione | ❌ |
| GET | `/leaderboard` | Classifica tavoli | ❌ |
| GET | `/qr/:qrCode` | Tavolo tramite QR code | ❌ |
| GET | `/:id` | Dettagli tavolo singolo | ❌ |
| PUT | `/:id/name` | Cambia nome tavolo | ❌ |
| POST | `/` | Crea nuovo tavolo | 👮 Cashier |
| PUT | `/:id` | Aggiorna tavolo | 👮 Cashier |
| DELETE | `/:id` | Elimina tavolo | 👑 Admin |
| GET | `/stats/summary` | Statistiche tavoli | 👮 Cashier |
| POST | `/reset-points` | Reset punti tutti tavoli | 👑 Admin |

### 💰 Points (`/api/points`)

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/add` | Aggiungi punti | 👮 Cashier |
| POST | `/redeem` | Riscatta punti | 👮 Cashier |
| GET | `/transactions` | Lista transazioni | 👮 Cashier |
| GET | `/table/:tableId/history` | Storico tavolo | ❌ |
| GET | `/user/:userId/activity` | Attività utente | ✅ Own/Admin |
| GET | `/stats/daily` | Statistiche giornaliere | 👮 Cashier |
| DELETE | `/transactions/:id` | Elimina transazione | 👑 Admin |

## 🛡️ Ruoli Utente

- **👑 Admin**: Accesso completo, gestione utenti e tavoli
- **👮 Cashier**: Gestione punti, creazione tavoli, statistiche  
- **👤 Customer**: Visualizzazione classifica, cambio nome tavolo

## 🔒 Sicurezza

### Rate Limiting
- **100 richieste / 15 minuti** per IP
- Protezione contro attacchi DDoS

### Headers Security (Helmet)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- E altro...

### Input Validation
- **express-validator** per validazione robusta
- **Sanitizzazione XSS** automatica
- **MongoDB injection** protection

### Password Security
- **bcrypt** con 12 rounds salt
- **JWT tokens** con scadenza 24h
- Password requirements enforced

## 🎯 QR Code Generation

Il sistema genera automaticamente QR codes per i tavoli:

```javascript
// Genera QR per tavolo
const qrCode = await generateQRCode(
  `${process.env.FRONTEND_URL}/?table=TABLE_1`,
  { filename: 'table-1.png' }
);

// Batch generation per tutti i tavoli
const results = await generateBatchQRCodes(tables, frontendUrl);
```

### Template di Stampa
- **Template HTML** per stampa QR codes
- **Layout responsive** per etichette/card
- **Personalizzazione** logo e testo ristorante

## 📊 Database Models

### User Model
```javascript
{
  username: String (unique),
  email: String (unique), 
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: 'admin' | 'cashier' | 'customer',
  isActive: Boolean
}
```

### Table Model
```javascript
{
  tableNumber: Number (unique),
  name: String,
  qrCode: String (unique),
  points: Number,
  location: String,
  capacity: Number,
  isActive: Boolean
}
```

### PointTransaction Model
```javascript
{
  table: ObjectId (ref: Table),
  assignedBy: ObjectId (ref: User),
  points: Number,
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTMENT' | 'BONUS',
  description: String,
  metadata: {
    previousPoints: Number,
    newPoints: Number,
    userAgent: String,
    ipAddress: String
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deploy su Render

### 1. Environment Variables su Render:
```
MONGODB_URI=mongodb+srv://...
NODE_ENV=production  
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend.onrender.com
```

### 2. Build Settings:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 20.x

## 📈 Monitoring & Logs

Il backend include logging avanzato:

```bash
# Development logs
NODE_ENV=development npm run dev

# Production logs (morgan combined)
NODE_ENV=production npm start
```

## 🤝 Contributing

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/nuova-funzionalita`)
3. Commit changes (`git commit -am 'Aggiungi nuova funzionalità'`)
4. Push branch (`git push origin feature/nuova-funzionalita`)
5. Crea Pull Request

## 📄 License

MIT License - vedi [LICENSE](LICENSE) per dettagli.

## 🆘 Support

Per supporto e domande:
- Apri un **Issue** su GitHub
- Email: support@qrtavoli.com
- Documentazione: `/api/docs`

---

**🍽️ QR Tavoli Backend v1.0** - Sistema punti fedeltà per ristoranti con QR codes
