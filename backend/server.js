const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// === LOGGER SETUP ===
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, 'combined.log') }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
// Price poller config
const PRICE_POLL_INTERVAL_MS = parseInt(process.env.PRICE_POLL_INTERVAL_MS) || 1000 * 60 * 5; // default 5 minutes
const PRICE_POLL_SYMBOLS = process.env.PRICE_POLL_SYMBOLS ? process.env.PRICE_POLL_SYMBOLS.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean) : [];
// Development: runtime toggle for random prices instead of fetching real data
let useRandomPrices = (process.env.USE_RANDOM_PRICES === '1' || process.env.USE_RANDOM_PRICES === 'true') || false;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Mock stock prices (production: fetch from real API)
const mockPrices = {
  'AAPL': 230.5, 'GOOGL': 175.2, 'MSFT': 415.8,
  'TSLA': 245.3, 'AMZN': 198.7, 'META': 520.4, 'NVDA': 890.2
};

// === UTILS ===
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { users: {}, priceHistory: {} };
  }
}

function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

async function getPrice(symbol) {
  const s = (symbol || '').toUpperCase();
  if (useRandomPrices) {
    try {
      const data = readData();
      const history = (data.priceHistory && data.priceHistory[s]) || [];
      const last = history.length ? history[history.length-1].price : (mockPrices[s] || 100);
      // random walk: small pct change
      const pct = (Math.random() - 0.5) * 0.02; // +/-1% default
      const nextPrice = Math.max(0.01, +(last * (1 + pct)).toFixed(4));
      logger.info(`Using random price for ${s}: ${nextPrice}`);
      return nextPrice;
    } catch (e) {
      logger.warn(`Random price generation failed for ${s}, falling back: ${e.message}`);
    }
  }
  // If symbol already contains an exchange suffix or prefix, try as-is first
  const candidates = (s.includes('.') || s.includes(':')) ? [s] : [s + '.NS', s + '.BO', s];

  for (const cand of candidates) {
    try {
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(cand)}?modules=price`,
        { timeout: 5000 }
      );
      const price = response.data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice;
      if (price !== undefined && price !== null) {
        if (cand !== s) logger.info(`Resolved ${s} -> ${cand}`);
        return price;
      }
    } catch (err) {
      logger.warn(`Failed to fetch real price for ${cand}, trying next (${err.message})`);
      // try next candidate
    }
  }

  // Fallback to mock prices using base symbol (strip suffix)
  const base = s.split('.')[0];
  logger.warn(`Failed to fetch real price for ${s}, using mock`);
  return mockPrices[base] || mockPrices[s] || 100;
}

// Generate random daily OHLC candles for `days` prior to today
function generateRandomDailyCandles(symbol, days = 20) {
  const s = (symbol || '').toUpperCase();
  const data = readData();
  const history = data.priceHistory?.[s] || [];
  let last = history.length ? history[history.length-1].price : (mockPrices[s] || 100);
  const candles = [];
  const today = new Date();

  // randomness params (tunable)
  const BASE_DAILY_VOL = parseFloat(process.env.RANDOM_BASE_VOL) || 0.02; // daily volatility ~2%
  const JUMP_PROB = parseFloat(process.env.RANDOM_JUMP_PROB) || 0.08; // 8% chance of jump on a day
  const JUMP_SCALE = parseFloat(process.env.RANDOM_JUMP_SCALE) || 0.06; // jumps ~6% on average

  // helper: generate single-day OHLC from a previous close
  function dailyOHLCFromPrev(prevClose) {
    const sigma = BASE_DAILY_VOL * (0.6 + Math.random() * 1.4);
    const mu = (Math.random() - 0.5) * 0.002;
    // gap at open
    let open = prevClose;
    if (Math.random() < JUMP_PROB) {
      const jump = (Math.random() - 0.5) * 2 * JUMP_SCALE;
      open = Math.max(0.01, +(open * (1 + jump)).toFixed(4));
    }
    // single-day return via lognormal step
    const z = randn_bm();
    const factor = Math.exp((mu - 0.5 * sigma * sigma) + sigma * z);
    const close = Math.max(0.01, +(open * factor).toFixed(4));

    // highs/lows around open/close
    const up = Math.max(open, close);
    const down = Math.min(open, close);
    const high = Math.max(up * (1 + Math.random() * sigma * 1.5), up + 0.0001);
    const low = Math.min(Math.max(down * (1 - Math.random() * sigma * 1.5), 0.0001), down);

    return {
      open: +open.toFixed(4),
      high: +high.toFixed(4),
      low: +low.toFixed(4),
      close: +close.toFixed(4),
      volume: Math.round(50000 + Math.random() * 300000)
    };
  }

  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0,10);

    const candle = dailyOHLCFromPrev(last);
    candles.push(Object.assign({ time: date }, candle));
    last = candle.close;
  }
  return candles;
}

// Store price history
function recordPrice(symbol, price) {
  const data = readData();
  if (!data.priceHistory) data.priceHistory = {};
  if (!data.priceHistory[symbol]) data.priceHistory[symbol] = [];
  
  const now = new Date().toISOString();
  data.priceHistory[symbol].push({ time: now, price });
  
  // Keep last 365 entries per symbol (1 year if daily)
  if (data.priceHistory[symbol].length > 365) {
    data.priceHistory[symbol].shift();
  }
  
  writeData(data);
}

// Get previous day's close (t-1) for a symbol from recorded history
function getPreviousClose(symbol) {
  const s = (symbol || '').toUpperCase();
  const data = readData();
  const items = data.priceHistory?.[s] || [];
  if (!items.length) return null;

  // group by date
  const groups = {};
  items.forEach(it => {
    const date = it.time.slice(0,10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(it);
  });

  const dates = Object.keys(groups).sort();
  const today = new Date().toISOString().slice(0,10);
  // pick last date strictly before today (t-1 or earlier)
  const prevDates = dates.filter(d => d < today);
  const targetDate = prevDates.length ? prevDates[prevDates.length-1] : dates[dates.length-1];
  if (!targetDate) return null;
  const arr = groups[targetDate];
  const close = arr[arr.length-1].price;
  return { date: targetDate, close, open: arr[0].price, high: Math.max(...arr.map(a=>a.price)), low: Math.min(...arr.map(a=>a.price)) };
}

// Get next day's close (first date strictly after targetDate) or first date > today
function getNextClose(symbol) {
  const s = (symbol || '').toUpperCase();
  const data = readData();
  const items = data.priceHistory?.[s] || [];
  if (!items.length) return null;

  const groups = {};
  items.forEach(it => {
    const date = it.time.slice(0,10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(it);
  });

  const dates = Object.keys(groups).sort();
  // return the earliest date after today
  const today = new Date().toISOString().slice(0,10);
  const after = dates.filter(d => d > today);
  const targetDate = after.length ? after[0] : (dates[dates.length-1] || null);
  if (!targetDate) return null;
  const arr = groups[targetDate];
  const close = arr[arr.length-1].price;
  return { date: targetDate, close, open: arr[0].price, high: Math.max(...arr.map(a=>a.price)), low: Math.min(...arr.map(a=>a.price)) };
}

// Simulate intraday series for a specific date using t-1 and t+1
app.get('/api/simulate/:symbol/:date', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const sym = symbol.toUpperCase();
    if (useRandomPrices) {
      const days = parseInt(req.query.days) || 20;
      const candles = generateRandomDailyCandles(sym, days);
      return res.json({ symbol: sym, candles });
    }

    // real-mode: fetch live price and record it so candles include latest intraday point
    try {
      const p = await getPrice(sym);
      if (p != null) recordPrice(sym, p);
    } catch (e) {
      logger.warn(`Live price record failed for ${sym}: ${e.message}`);
    }

    // Re-read after potential record
    const updated = readData();
    const items = updated.priceHistory?.[sym] || [];

    // Group by date (YYYY-MM-DD) and include today's data (real-time)
    const groups = {};
    items.forEach(it => {
      const date = it.time.slice(0,10);
      if (!groups[date]) groups[date] = [];
      groups[date].push({ time: it.time, price: it.price });
    });

    const dates = Object.keys(groups).sort();
    const candles = [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      let arr = groups[date];

      let open, close, high, low;
      if ((arr.length || 0) >= 4) {
        open = arr[0].price;
        close = arr[arr.length-1].price;
        high = Math.max(...arr.map(a=>a.price));
        low = Math.min(...arr.map(a=>a.price));
      } else {
        const prev = getPreviousClose(sym);
        if (prev && prev.close != null) {
          const s = generateDailyCandleFromPrev(prev.close);
          open = s.open; close = s.close; high = s.high; low = s.low;
        } else if (arr.length > 0) {
          open = arr[0].price;
          close = arr[arr.length-1].price;
          high = Math.max(...arr.map(a=>a.price));
          low = Math.min(...arr.map(a=>a.price));
        } else {
          // fallback: use live price as flat candle
          const p = await getPrice(sym);
          recordPrice(sym, p);
          open = close = high = low = p;
        }
      }
      candles.push({ time: date, open, high, low, close });
    }

    res.json({ symbol: sym, candles });
  } catch (err) {
    logger.error(`Simulate error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});
function randn_bm() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate a single-day synthetic OHLC candle from a previous close (used when sparse history)
function generateDailyCandleFromPrev(prevClose) {
  const BASE_DAILY_VOL = parseFloat(process.env.RANDOM_BASE_VOL) || 0.02;
  const JUMP_PROB = parseFloat(process.env.RANDOM_JUMP_PROB) || 0.08;
  const JUMP_SCALE = parseFloat(process.env.RANDOM_JUMP_SCALE) || 0.06;
  const sigma = BASE_DAILY_VOL * (0.6 + Math.random() * 1.4);
  const mu = (Math.random() - 0.5) * 0.002;
  let open = prevClose;
  if (Math.random() < JUMP_PROB) {
    const jump = (Math.random() - 0.5) * 2 * JUMP_SCALE;
    open = Math.max(0.01, +(open * (1 + jump)).toFixed(4));
  }
  const z = randn_bm();
  const factor = Math.exp((mu - 0.5 * sigma * sigma) + sigma * z);
  const close = Math.max(0.01, +(open * factor).toFixed(4));
  const up = Math.max(open, close);
  const down = Math.min(open, close);
  const high = Math.max(up * (1 + Math.random() * sigma * 1.5), up + 0.0001);
  const low = Math.min(Math.max(down * (1 - Math.random() * sigma * 1.5), 0.0001), down);
  return { open: +open.toFixed(4), high: +high.toFixed(4), low: +low.toFixed(4), close: +close.toFixed(4), volume: Math.round(50000 + Math.random() * 300000) };
}

function simulateIntradayPrices(prevObj, nextObj, date, points = 60) {
  // prevObj and nextObj: { date, close, open, high, low }
  // generate `points` prices across trading hours (09:30-15:30 local) for given date
  const start = new Date(date + 'T09:30:00Z');
  const end = new Date(date + 'T15:30:00Z');
  const startTime = start.getTime();
  const endTime = end.getTime();
  const out = [];

  // linear trend from prev close to next close across the day
  const startPrice = prevObj?.close ?? prevObj?.open ?? (nextObj?.close || 100);
  const endPrice = nextObj?.close ?? nextObj?.open ?? startPrice;

  // base volatility proxy (scale with absolute pct change)
  const pctChange = Math.abs(endPrice - startPrice) / Math.max(1, startPrice);
  const vol = Math.max(0.0005, pctChange * 0.02); // small base vol

  let price = startPrice;
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = startPrice + (endPrice - startPrice) * t;
    // random walk around trend
    const shock = randn_bm() * vol * trend;
    price = Math.max(0.01, trend + shock);
    const ts = new Date(startTime + Math.round((endTime - startTime) * t)).toISOString();
    out.push({ time: ts, price });
  }

  return out;
}

// --- Price polling (background) ---
let _isPolling = false;
async function pollTrackedSymbols() {
  if (_isPolling) return;
  _isPolling = true;
  try {
    const data = readData();
    const symbolsSet = new Set(PRICE_POLL_SYMBOLS);
    // collect from user holdings
    Object.values(data.users || {}).forEach(u => { if (u.holdings) Object.keys(u.holdings).forEach(s => symbolsSet.add(s)); });
    // collect from existing history
    Object.keys(data.priceHistory || {}).forEach(s => symbolsSet.add(s));
    // fallback to mock prices
    Object.keys(mockPrices).forEach(s => symbolsSet.add(s));

    const symbols = Array.from(symbolsSet);
    if (symbols.length === 0) return;

    logger.info(`Polling prices for symbols: ${symbols.join(', ')}`);
    const results = {};
    await Promise.all(symbols.map(async (s) => { results[s] = await getPrice(s); }));

    // Batch write prices (single write to avoid races)
    const now = new Date().toISOString();
    const d2 = readData();
    if (!d2.priceHistory) d2.priceHistory = {};
    symbols.forEach(s => {
      if (!d2.priceHistory[s]) d2.priceHistory[s] = [];
      d2.priceHistory[s].push({ time: now, price: results[s] });
      if (d2.priceHistory[s].length > 365) d2.priceHistory[s].shift();
    });
    writeData(d2);
    logger.info(`Recorded ${symbols.length} prices at ${now}`);
  } catch (err) {
    logger.error(`Polling error: ${err.message}`);
  } finally {
    _isPolling = false;
  }
}

function startPricePolling() {
  // initial poll then interval
  pollTrackedSymbols().catch(err => logger.error(`Initial poll failed: ${err.message}`));
  setInterval(() => pollTrackedSymbols().catch(err => logger.error(`Scheduled poll failed: ${err.message}`)), PRICE_POLL_INTERVAL_MS);
}

// Validation middleware
function validateErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`JWT verify failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// === ROUTES ===

app.get('/', (req, res) => {
  res.json({ message: 'Stock Simulator API v2 (Production)', version: '2.0.0' });
});

// ===== AUTH ROUTES =====

// Register
app.post(
  '/api/auth/register',
  [
    body('username').isLength({ min: 3, max: 20 }).withMessage('Username 3-20 chars'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('email').isEmail().withMessage('Invalid email')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { username, password, email } = req.body;
      const data = readData();
      
      if (data.users[username]) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      data.users[username] = {
        password: hashedPassword,
        email,
        cash: 100000,
        holdings: {},
        createdAt: new Date().toISOString(),
        transactions: []
      };
      
      writeData(data);
      logger.info(`User registered: ${username}`);
      res.json({ message: 'User registered successfully' });
    } catch (err) {
      logger.error(`Register error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
);

// Login
app.post(
  '/api/auth/login',
  [
    body('username').notEmpty(),
    body('password').notEmpty()
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { username, password } = req.body;
      const data = readData();
      const user = data.users[username];
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      logger.info(`User logged in: ${username}`);
      res.json({ token, username, email: user.email });
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
);

// ===== USER ROUTES =====

// Get portfolio (protected)
app.get('/api/user/portfolio', authMiddleware, async (req, res) => {
  try {
    const data = readData();
    const user = data.users[req.user.username];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate market value of holdings
    const holdings = user.holdings || {};
    const symbols = Object.keys(holdings);
    let marketValue = 0;
    const detailed = [];

    // fetch t-1 (previous close) price if available, else live price
    const pricePromises = symbols.map(async s => {
      const prev = getPreviousClose(s);
      if (prev && prev.close != null) return prev.close;
      return await getPrice(s);
    });
    const prices = await Promise.all(pricePromises);

    symbols.forEach((sym, idx) => {
      const qty = holdings[sym];
      const price = prices[idx] || 0;
      const value = price * qty;
      marketValue += value;
      detailed.push({ symbol: sym, quantity: qty, price, value });
    });

    const totalValue = (user.cash || 0) + marketValue;
    // Profit/Loss relative to starting balance (100000)
    const STARTING_BALANCE = 100000;
    const profit = totalValue - STARTING_BALANCE;
    const profitPercent = (profit / STARTING_BALANCE) * 100;

    res.json({
      username: req.user.username,
      cash: user.cash,
      holdings: detailed,
      marketValue,
      totalValue,
      profit,
      profitPercent,
      createdAt: user.createdAt
    });
  } catch (err) {
    logger.error(`Portfolio fetch error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get quote with historical data
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getPrice(symbol.toUpperCase());
    recordPrice(symbol.toUpperCase(), price);
    
    const data = readData();
    const history = data.priceHistory?.[symbol.toUpperCase()] || [];
    
    res.json({
      symbol: symbol.toUpperCase(),
      currentPrice: price,
      history: history.slice(-20) // Last 20 data points for graph
    });
  } catch (err) {
    logger.error(`Quote error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get extended price history (for graphs)
app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const sym = symbol.toUpperCase();
    if (useRandomPrices) {
      // return a random daily close series for charting
      const days = parseInt(req.query.days) || 20;
      const candles = generateRandomDailyCandles(sym, days);
      // convert to simple history points (time, price) using close
      const history = candles.map(c => ({ time: c.time, price: c.close }));
      return res.json({ symbol: sym, chartData: history });
    }

    // For real-mode: fetch live price and record it so graph reflects real-time
    try {
      const live = await getPrice(sym);
      if (live != null) recordPrice(sym, live);
    } catch (e) {
      logger.warn(`Live price record failed for ${sym}: ${e.message}`);
    }

    const data = readData();
    const history = data.priceHistory?.[sym] || [];
    // Return last N points (query param `points`)
    const points = parseInt(req.query.points) || 60;
    const recent = history.slice(-points);
    res.json({ symbol: sym, chartData: recent });
  } catch (err) {
    logger.error(`Chart error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Candlestick data (OHLC) generated from recorded price history
app.get('/api/candles/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const sym = (symbol || '').toUpperCase();
    const days = Math.max(1, parseInt(req.query.days) || 20);

    // If runtime random-mode is enabled, return generated random daily candles
    if (useRandomPrices) {
      const days = parseInt(req.query.days) || 20;
      const candles = generateRandomDailyCandles(sym, days);
      return res.json({ symbol: sym, candles });
    }

    const data = readData();
    const history = data.priceHistory?.[sym] || [];

    if (history.length === 0) {
      // ensure at least one price exists
      const p = await getPrice(sym);
      recordPrice(sym, p);
    }

    // Re-read after potential record
    const updated = readData();
    const items = updated.priceHistory?.[sym] || [];

    // Group by date (YYYY-MM-DD) and exclude today's partial data (use t-1)
    const groups = {};
    items.forEach(it => {
      const date = it.time.slice(0,10);
      if (!groups[date]) groups[date] = [];
      groups[date].push({ time: it.time, price: it.price });
    });

    const today = new Date().toISOString().slice(0,10);
    // For each past date, if there are few recorded points, try to simulate intraday prices
    const dates = Object.keys(groups).sort().filter(d => d < today);
    const candles = [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      let arr = groups[date];

      let open, close, high, low;
      if ((arr.length || 0) >= 4) {
        open = arr[0].price;
        close = arr[arr.length-1].price;
        high = Math.max(...arr.map(a=>a.price));
        low = Math.min(...arr.map(a=>a.price));
      } else {
        // sparse day: synthesize a daily candle from previous close (no t+1 dependency)
        const prev = getPreviousClose(sym);
        if (prev && prev.close != null) {
          const s = generateDailyCandleFromPrev(prev.close);
          open = s.open; close = s.close; high = s.high; low = s.low;
        } else if (arr.length > 0) {
          // fall back to using whatever points exist
          open = arr[0].price;
          close = arr[arr.length-1].price;
          high = Math.max(...arr.map(a=>a.price));
          low = Math.min(...arr.map(a=>a.price));
        } else {
          // no data at all: fetch a live price and use it as a flat candle
          const p = await getPrice(sym);
          recordPrice(sym, p);
          open = close = high = low = p;
        }
      }
      candles.push({ time: date, open, high, low, close });
    }

    // honor `days` query param by returning only the most recent `days` candles
    res.json({ symbol: sym, candles: candles.slice(-days) });
  } catch (err) {
    logger.error(`Candles error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ===== TRADE ROUTES (PROTECTED) =====

// Buy shares
app.post(
  '/api/buy',
  authMiddleware,
  [
    body('symbol').notEmpty().withMessage('Symbol required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { symbol, quantity } = req.body;
      const qty = parseInt(quantity);
      const data = readData();
      const user = data.users[req.user.username];
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const price = await getPrice(symbol.toUpperCase());
      recordPrice(symbol.toUpperCase(), price);
      
      const cost = price * qty;
      
      if (user.cash < cost) {
        return res.status(400).json({ error: `Insufficient funds. Need $${cost.toFixed(2)}, have $${user.cash.toFixed(2)}` });
      }
      
      user.cash -= cost;
      user.holdings[symbol.toUpperCase()] = (user.holdings[symbol.toUpperCase()] || 0) + qty;
      
      // Record transaction
      if (!user.transactions) user.transactions = [];
      user.transactions.push({
        type: 'BUY',
        symbol: symbol.toUpperCase(),
        quantity: qty,
        price,
        total: cost,
        timestamp: new Date().toISOString()
      });
      
      writeData(data);
      logger.info(`Buy transaction: ${req.user.username} bought ${qty} ${symbol.toUpperCase()} @ $${price}`);
      
      res.json({
        message: 'Purchase successful',
        user: { cash: user.cash, holdings: user.holdings }
      });
    } catch (err) {
      logger.error(`Buy error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
);

// Sell shares
app.post(
  '/api/sell',
  authMiddleware,
  [
    body('symbol').notEmpty().withMessage('Symbol required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { symbol, quantity } = req.body;
      const qty = parseInt(quantity);
      const data = readData();
      const user = data.users[req.user.username];
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const currentQty = user.holdings[symbol.toUpperCase()] || 0;
      if (currentQty < qty) {
        return res.status(400).json({ error: `Not enough shares. Have ${currentQty}, trying to sell ${qty}` });
      }
      
      const price = await getPrice(symbol.toUpperCase());
      recordPrice(symbol.toUpperCase(), price);
      
      const proceeds = price * qty;
      
      user.cash += proceeds;
      user.holdings[symbol.toUpperCase()] -= qty;
      
      if (user.holdings[symbol.toUpperCase()] <= 0) {
        delete user.holdings[symbol.toUpperCase()];
      }
      
      // Record transaction
      if (!user.transactions) user.transactions = [];
      user.transactions.push({
        type: 'SELL',
        symbol: symbol.toUpperCase(),
        quantity: qty,
        price,
        total: proceeds,
        timestamp: new Date().toISOString()
      });
      
      writeData(data);
      logger.info(`Sell transaction: ${req.user.username} sold ${qty} ${symbol.toUpperCase()} @ $${price}`);
      
      res.json({
        message: 'Sale successful',
        user: { cash: user.cash, holdings: user.holdings }
      });
    } catch (err) {
      logger.error(`Sell error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get transaction history
app.get('/api/transactions', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const user = data.users[req.user.username];
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ transactions: user.transactions || [] });
  } catch (err) {
    logger.error(`Transactions error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard - rank users by portfolio total value
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const data = readData();
    const users = data.users || {};

    // Collect unique symbols across all users
    const symbolsSet = new Set();
    Object.values(users).forEach(u => {
      if (u.holdings) Object.keys(u.holdings).forEach(s => symbolsSet.add(s));
    });
    const symbols = Array.from(symbolsSet);

    // Fetch t-1 (previous close) once per symbol when available, otherwise live
    const priceMap = {};
    await Promise.all(symbols.map(async (s) => {
      const prev = getPreviousClose(s);
      if (prev && prev.close != null) priceMap[s] = prev.close;
      else priceMap[s] = await getPrice(s);
    }));

    // Compute portfolio values
    const STARTING_BALANCE = 100000;
    const board = Object.entries(users).map(([username, u]) => {
      let marketValue = 0;
      if (u.holdings) {
        Object.entries(u.holdings).forEach(([sym, qty]) => {
          const price = priceMap[sym] || 0;
          marketValue += price * qty;
        });
      }
      const totalValue = (u.cash || 0) + marketValue;
      const profit = totalValue - STARTING_BALANCE;
      const profitPercent = (profit / STARTING_BALANCE) * 100;
      return { username, totalValue, cash: u.cash || 0, marketValue, profit, profitPercent };
    });

    board.sort((a,b) => b.totalValue - a.totalValue);
    const top = board.slice(0, Number(limit)).map((u, idx) => ({ rank: idx+1, ...u }));
    res.json({ leaderboard: top });
  } catch (err) {
    logger.error(`Leaderboard error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Admin: get runtime random-prices flag
app.get('/api/admin/random-prices', authMiddleware, (req, res) => {
  try {
    res.json({ useRandomPrices: !!useRandomPrices });
  } catch (err) {
    logger.error(`Get random-prices flag error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Admin: set runtime random-prices flag (protected)
app.post('/api/admin/random-prices', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    useRandomPrices = enabled;
    logger.info(`User ${req.user.username} set useRandomPrices=${useRandomPrices}`);
    res.json({ useRandomPrices });
  } catch (err) {
    logger.error(`Set random-prices flag error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// === ERROR HANDLING ===
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// === START SERVER ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Stock Simulator Server - Production Mode`);
  console.log(`Port: ${PORT}`);
  console.log(`Logs available in: ${path.join(__dirname, 'combined.log')}`);
});
