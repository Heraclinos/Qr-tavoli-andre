# QR Tavoli Frontend

Frontend moderno e responsivo per il sistema QR punti fedeltà, completamente compatibile con il backend Node.js/MongoDB.

## 🚀 Caratteristiche

- **🏠 Homepage pulita** con solo dashboard classifica
- **📱 QR scan intelligente** con tavolo evidenziato  
- **🔐 Sistema login persistente** con memoria locale
- **👨‍💼 Dashboard cassiere dedicata** senza distrazioni
- **⭐ Gestione punti** completa (+1, +5, +10, +20, custom)
- **🛡️ Sicurezza client-side** anti-XSS e SQL injection
- **🎨 Design accattivante** con animazioni moderne
- **📱 Responsive design** mobile-first
- **🔄 Auto-refresh** e fallback offline

## 📁 Struttura File

```
frontend/
├── index.html    # Struttura HTML completa
├── style.css     # Design moderno con CSS Grid/Flexbox
├── app.js        # Logica JavaScript + API integration
└── README.md     # Questa documentazione
```

## 🔗 Integrazione Backend

### API Endpoints Utilizzati:
- ✅ `GET /api/tables/leaderboard` - Classifica completa
- ✅ `GET /api/tables/qr/:qrCode` - Dati tavolo specifico
- ✅ `PUT /api/tables/:id/name` - Cambio nome tavolo
- ✅ `POST /api/points/add` - Aggiunta/sottrazione punti
- ✅ `POST /api/auth/login` - Login cassiere
- ✅ `GET /api/points/table/:id/history` - Transazioni recenti

### Configurazione Automatica:
Il frontend rileva automaticamente l'ambiente:

```javascript
// In app.js - Configurazione API
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'              // Sviluppo locale
        : 'https://qr-tavoli-backend.onrender.com/api'  // Produzione
};
```

## 🚀 Deploy su Render

### 1. **Static Site Setup**
1. Vai su [Render Dashboard](https://dashboard.render.com)
2. **New** → **Static Site**
3. **Connect Repository** o **Manual Deploy**

### 2. **Configurazione Deploy**
- **Build Command**: `(lascia vuoto)`
- **Publish Directory**: `.` (root directory)
- **Environment**: `Static Site`

### 3. **Upload Files**
Carica i 3 file nella root:
- `index.html`
- `style.css` 
- `app.js`

### 4. **Configurazione Backend URL**
Se il tuo backend non è su `qr-tavoli-backend.onrender.com`, modifica `app.js`:

```javascript
// Linea ~10 in app.js
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://IL-TUO-BACKEND.onrender.com/api',  // ← Cambia qui
```

## 🎯 Workflow Utente

### **🏠 Homepage (`/`):**
1. Carica classifica completa dal database
2. Mostra statistiche tavoli 
3. Login sempre disponibile in alto a destra

### **📱 QR Cliente (`/?table=TABLE_5`):**
1. Carica dashboard con Tavolo 5 evidenziato
2. Form per cambiare nome tavolo
3. Protezioni input anti-injection
4. Login disponibile per upgrade a cassiere

### **👨‍💼 Cassiere (già loggato + QR scan):**
1. Reindirizza automaticamente alla dashboard cassiere
2. Interfaccia dedicata senza classifica
3. Bottoni punti: +1, +5, +10, +20, custom
4. Sottrazione punti: -1, -5, -10, -20, custom
5. Cronologia operazioni in tempo reale

### **🔑 Login Cassiere:**
1. Modal elegante con form
2. Salvataggio sicuro in localStorage
3. Token JWT con scadenza 24h
4. Riconoscimento automatico sui QR successivi

## 🔐 Sicurezza Implementata

### **Input Sanitization:**
```javascript
// Protezione anti-XSS e SQL injection
static sanitizeInput(input) {
    return input
        .trim()
        .replace(/[<>"'&]/g, '')           // HTML chars
        .replace(/[;\-\-\/\*]/g, '')  // SQL chars
        .replace(/script|javascript/gi, '') // Script injection
        .substring(0, 50);                 // Max length
}
```

### **Validazioni Client-Side:**
- **Nome tavolo**: 1-50 caratteri, solo lettere/numeri/spazi
- **Punti**: solo numeri interi, range -100/+100
- **Token JWT**: verifica formato e scadenza
- **QR Code**: formato TABLE_X obbligatorio

### **Rate Limiting Simulato:**
- Debounce nelle chiamate API
- Timeout 10 secondi per richieste
- Gestione errori con retry

## 🎨 Design System

### **Color Palette:**
```css
:root {
    --primary: #10b981;        /* Verde principale */
    --primary-dark: #059669;   /* Verde scuro */
    --cashier-primary: #3b82f6; /* Blu cassiere */
    --success: #10b981;        /* Successo */
    --danger: #ef4444;         /* Errore */
    --warning: #f59e0b;        /* Warning */
}
```

### **Layout Responsive:**
- **Desktop**: Layout a 3 colonne, sidebar
- **Tablet**: Layout a 2 colonne
- **Mobile**: Single column, stack verticale
- **Breakpoints**: 320px, 768px, 1024px, 1200px

### **Components:**
- **Cards** con hover effects e shadows
- **Buttons** con gradients e animazioni
- **Modal** con backdrop blur
- **Toast** notifications posizionate
- **Loading** states coordinati

## 🧪 Testing Locale

### **Setup Sviluppo:**
1. **Clona** il repository
2. **HTTP Server** semplice:
```bash
# Opzione 1: Python
python -m http.server 8000

# Opzione 2: Node.js
npx http-server -p 8000

# Opzione 3: PHP  
php -S localhost:8000
```

### **Test API Integration:**
1. **Avvia backend** su localhost:3000
2. **Apri frontend** su localhost:8000  
3. **Controlla console** per chiamate API
4. **Testa flow** completo: homepage → QR → login → cassiere

## 📱 PWA Features

Il frontend include funzionalità PWA:

### **Manifest (inline):**
- **Installabile** come app mobile
- **Icons** dinamiche con emoji
- **Theme color** personalizzato
- **Standalone** display mode

### **Offline Support:**
- **Service Worker** basic (futuro)
- **LocalStorage** per sessioni
- **Fallback data** per modalità offline
- **Cache API** per risorse statiche

## 🔧 Customizzazione

### **Tema Colori:**
Modifica le CSS custom properties in `style.css`:

```css
:root {
    --primary: #your-color;          /* Colore principale */
    --cashier-primary: #your-blue;   /* Colore cassiere */
    /* ... altri colori */
}
```

### **Logo/Branding:**
Cambia in `index.html`:

```html
<div class="logo">
    <span class="logo-icon">🍽️</span>     <!-- Il tuo logo -->
    <span class="logo-text">QR Tavoli</span> <!-- Il tuo nome -->
</div>
```

### **Configurazioni:**
Modifica in `app.js`:

```javascript
const APP_CONFIG = {
    SESSION_DURATION: 24 * 60 * 60 * 1000,  // Durata login
    MAX_TABLE_NAME_LENGTH: 50,               // Max chars nome
    MAX_POINTS_TRANSACTION: 100,             // Max punti/transazione
    REFRESH_INTERVAL: 30000,                 // Auto-refresh (ms)
};
```

## 🐛 Troubleshooting

### **Problemi Comuni:**

1. **CORS Errors:**
   - Verifica che il backend includa il tuo frontend URL nelle opzioni CORS
   - Controlla che l'API_BASE_URL sia corretto

2. **Login non funziona:**
   - Controlla credenziali: `cassiere1` / `cassiere123`
   - Verifica che l'utente abbia ruolo 'cashier'
   - Controlla console per errori API

3. **Dati non si caricano:**
   - Verifica che il backend sia online
   - Controlla Network tab in DevTools
   - Modalità offline mostra dati mock

4. **Punti non si salvano:**
   - Solo cassieri loggati possono modificare punti
   - Controlla che il token JWT non sia scaduto
   - Verifica validazione punti (-100/+100 max)

### **Debug Mode:**
Su localhost, sono disponibili helper di debug:

```javascript
// Console browser
window.debugApp.state       // Stato app
window.debugApp.session     // Gestione sessioni
window.debugApp.api         // Client API
window.debugApp.toast       // Notifiche
```

## 📊 Performance

### **Metriche Target:**
- **First Paint**: < 1.5s
- **Interactive**: < 2.5s
- **Bundle Size**: < 500KB (attuale: ~150KB)
- **Core Web Vitals**: Green scores

### **Ottimizzazioni:**
- **CSS/JS** minificati in produzione
- **Fonts** precaricati da Google Fonts
- **Images** ottimizzate (SVG icons)
- **API calls** con timeout e retry
- **LocalStorage** per sessioni persistenti

## 🔄 Aggiornamenti Futuri

### **Roadmap:**
- [ ] **Service Worker** per offline completo
- [ ] **Push notifications** per aggiornamenti punti
- [ ] **Dark mode** toggle
- [ ] **Multi-language** support
- [ ] **Analytics** integration
- [ ] **QR Scanner** integrato con camera
- [ ] **Print QR** functionality

## 📄 License

MIT License - Uso libero per progetti personali e commerciali.

## 🆘 Support

- **Issues**: Apri un ticket su GitHub
- **Email**: support@qrtavoli.com
- **Demo**: [Frontend Demo](https://qr-tavoli-frontend.onrender.com)

---

**🍽️ QR Tavoli Frontend v1.0** - Sistema punti fedeltà moderno e accattivante
