import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { MarketType } from "./models/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure public/logos directory exists
  const logosDir = path.join(__dirname, "public", "logos");
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  // Logo Proxy Route
  app.get("/api/logos/:symbol", async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    
    // 1. Check if logo exists locally (try svg then png)
    const extensions = ["svg", "png", "jpg", "jpeg"];
    for (const ext of extensions) {
      const filePath = path.join(logosDir, `${symbol}.${ext}`);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    // 2. Try to fetch and save (JIT)
    const sources = [
      { url: `https://bin.bnbstatic.com/static/assets/logos/${symbol}.png`, ext: "png" },
      { url: `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`, ext: "png" },
      { url: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`, ext: "png" },
      { url: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${symbol}/logo.png`, ext: "png" },
      { url: `https://static.okx.com/cdn/oksupport/asset/currency/icon/${symbol.toLowerCase()}.png`, ext: "png" },
      { url: `https://www.gate.io/images/coin_icon/64/${symbol.toLowerCase()}.png`, ext: "png" }
    ];

    for (const source of sources) {
      try {
        const response = await axios.get(source.url, { responseType: "arraybuffer", timeout: 3000 });
        if (response.status === 200) {
          const savePath = path.join(logosDir, `${symbol}.${source.ext}`);
          fs.writeFileSync(savePath, Buffer.from(response.data));
          return res.sendFile(savePath);
        }
      } catch (error) {
        // Continue to next source
      }
    }

    // 3. Fallback to UI Avatars
    res.redirect(`https://ui-avatars.com/api/?name=${symbol}&background=1a1a1a&color=fff&bold=true&font-size=0.33`);
  });

  // API Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Global pool for exchange connections
  const globalExchangeSockets = new Map<string, WebSocket>();
  // Track which clients want which exchange data
  const exchangeSubscribers = new Map<string, Set<WebSocket>>();
  // Track subscription timers to avoid overlapping bursts
  const bybitSubscriptionTimers = new Map<string, NodeJS.Timeout[]>();
  // Cache for the latest snapshot of each symbol to support new client connections
  const snapshotCache = new Map<string, any>();
  // Track ticker subscriptions
  const tickerSubscribers = new Map<string, Set<WebSocket>>();

  function subscribeToBybit(ws: WebSocket, cfg: any) {
    if (!cfg.symbols || cfg.symbols.length === 0) return;
    
    const configKey = `${cfg.exchange}:${cfg.marketType}`;
    console.log(`[Global WS] Subscribing to Bybit symbols for ${configKey} (Count: ${cfg.symbols.length})`);
    
    // Clear existing timers for this socket to avoid overlapping subscription bursts
    if (bybitSubscriptionTimers.has(configKey)) {
      bybitSubscriptionTimers.get(configKey)?.forEach(t => clearTimeout(t));
    }
    const timers: NodeJS.Timeout[] = [];
    bybitSubscriptionTimers.set(configKey, timers);

    const symbols = cfg.symbols;
    const chunkSize = 10;
    const depth = 50; // Use 50 for both to be safe and consistent
    
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      const subMsg = {
        op: 'subscribe',
        args: chunk.map((s: string) => `orderbook.${depth}.${s.toUpperCase()}`),
        req_id: `sub_${Date.now()}_${i}`
      };
      
      const timer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(subMsg));
          } catch (e) {
            console.error(`[Global WS] Error sending sub to Bybit:`, e);
          }
        }
      }, (i / chunkSize) * 200); // 200ms between chunks
      timers.push(timer);
    }
  }

  function subscribeTickersBybit(ws: WebSocket, exchange: string, marketType: MarketType, tickers: any[]) {
    if (!tickers || tickers.length === 0) return;
    const subMsg = {
      op: 'subscribe',
      args: tickers.map(t => `tickers.${t.symbol.toUpperCase()}`),
      req_id: `sub_tickers_${Date.now()}`
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(subMsg));
    }
  }

  function subscribeToBinance(ws: WebSocket, cfg: any) {
    if (!cfg.subscriptionMessages || cfg.subscriptionMessages.length === 0) return;
    
    const configKey = `${cfg.exchange}:${cfg.marketType}`;
    console.log(`[Global WS] Subscribing to Binance symbols for ${configKey}`);
    
    cfg.subscriptionMessages.forEach((msg: any, i: number) => {
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(msg));
          } catch (e) {
            console.error(`[Global WS] Error sending sub to Binance:`, e);
          }
        }
      }, i * 200);
    });
  }

  function subscribeTickersBinance(ws: WebSocket, exchange: string, marketType: MarketType, tickers: any[]) {
    if (!tickers || tickers.length === 0) return;
    const subMsg = {
      method: "SUBSCRIBE",
      params: tickers.map(t => `${t.symbol.toLowerCase()}@ticker`),
      id: Date.now()
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(subMsg));
    }
  }

  function getExchangeSocket(cfg: any) {
    const configKey = `${cfg.exchange}:${cfg.marketType}`;
    
    if (globalExchangeSockets.has(configKey)) {
      const socket = globalExchangeSockets.get(configKey);
      if (socket?.readyState === WebSocket.OPEN) {
        // If already open, we MUST re-subscribe for Bybit to trigger a snapshot for the new client
        // This is critical because the client engine ignores deltas until it gets a snapshot
        if (cfg.exchange.startsWith('Bybit')) {
          subscribeToBybit(socket, cfg);
        } else if (cfg.exchange.startsWith('Binance')) {
          subscribeToBinance(socket, cfg);
        }
        return socket;
      }
      if (socket?.readyState === WebSocket.CONNECTING) {
        return socket;
      }
    }

    console.log(`[Global WS] Creating shared connection for ${configKey} -> ${cfg.wsUrl}`);
    const ws = new WebSocket(cfg.wsUrl);
    globalExchangeSockets.set(configKey, ws);

    ws.on("open", () => {
      console.log(`[Global WS] Shared connection OPEN for ${configKey}`);
      if (cfg.exchange.startsWith('Bybit')) {
        subscribeToBybit(ws, cfg);
      } else if (cfg.exchange.startsWith('Binance')) {
        subscribeToBinance(ws, cfg);
      }
    });

    ws.on("message", (data) => {
      const subscribers = exchangeSubscribers.get(configKey);
      const tickers = tickerSubscribers.get(configKey);
      
      if ((subscribers && subscribers.size > 0) || (tickers && tickers.size > 0)) {
        try {
          const rawData = data.toString();
          
          // Filter out control messages to save bandwidth
          if (rawData.includes('"op":"pong"') || rawData.includes('"ret_msg":"pong"')) return;
          if (rawData.includes('"success":true') && rawData.includes('"op":"subscribe"')) return;

          const parsed = JSON.parse(rawData);
          
          // Determine if this is ticker data
          let isTicker = false;
          if (cfg.exchange.startsWith('Bybit')) {
            isTicker = parsed.topic?.startsWith('tickers');
          } else if (cfg.exchange.startsWith('Binance')) {
            isTicker = parsed.e === '24hrTicker' || (parsed.data && parsed.data.e === '24hrTicker');
          }

          if (isTicker) {
            const message = JSON.stringify({
              type: "EXCHANGE_DATA",
              dataType: "TICKER",
              exchange: cfg.exchange,
              marketType: cfg.marketType,
              data: parsed
            });
            tickers?.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            });
            return;
          }

          // Cache Bybit snapshots
          if (cfg.exchange.startsWith('Bybit') && parsed.type === 'snapshot' && parsed.topic) {
            snapshotCache.set(`${configKey}:${parsed.topic}`, parsed);
          }
          
          // Cache Binance messages (treat as snapshots for new clients)
          if (cfg.exchange.startsWith('Binance')) {
            const symbol = parsed.s || (parsed.data && parsed.data.s);
            if (symbol) {
              snapshotCache.set(`${configKey}:${symbol.toUpperCase()}`, parsed);
            }
          }

          // Wrap the raw data in our protocol
          const message = JSON.stringify({
            type: "EXCHANGE_DATA",
            dataType: "DEPTH",
            exchange: cfg.exchange,
            marketType: cfg.marketType,
            data: parsed
          });
          
          subscribers?.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        } catch (e) {
          // Ignore malformed JSON or other parsing errors
        }
      }
    });

    ws.on("close", () => {
      console.warn(`[Global WS] Shared connection CLOSED for ${configKey}. Reconnecting in 5s...`);
      globalExchangeSockets.delete(configKey);

      // Clear cache for this exchange on close to avoid stale data
      const prefix = `${configKey}:`;
      for (const key of snapshotCache.keys()) {
        if (key.startsWith(prefix)) snapshotCache.delete(key);
      }

      if (bybitSubscriptionTimers.has(configKey)) {
        bybitSubscriptionTimers.get(configKey)?.forEach(t => clearTimeout(t));
        bybitSubscriptionTimers.delete(configKey);
      }
      
      setTimeout(() => {
        const subs = exchangeSubscribers.get(configKey);
        if (subs && subs.size > 0) {
          getExchangeSocket(cfg);
        }
      }, 5000);
    });

    ws.on("error", (err) => {
      const errorMessage = err.message;
      console.error(`[Global WS] Shared connection ERROR for ${configKey}:`, errorMessage);
      
      // Notify all subscribers about the error
      const subscribers = exchangeSubscribers.get(configKey);
      if (subscribers && subscribers.size > 0) {
        const errorPayload = JSON.stringify({
          type: "EXCHANGE_ERROR",
          exchange: cfg.exchange,
          marketType: cfg.marketType,
          message: errorMessage,
          isRegionalBlock: errorMessage.includes('451')
        });
        subscribers.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(errorPayload);
          }
        });
      }
    });

    // Heartbeat
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        if (cfg.exchange.startsWith('Bybit')) {
          ws.send(JSON.stringify({ op: 'ping' }));
        } else if (cfg.exchange.startsWith('Binance')) {
          ws.ping(); 
        }
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        clearInterval(pingInterval);
      }
    }, 20000);

    return ws;
  }

  wss.on("connection", (clientWs) => {
    console.log("[WS Proxy] Client connected");
    const clientSubscriptions = new Set<string>();

    clientWs.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        
        if (payload.type === "CONNECT_EXCHANGES") {
          const configs = payload.configs;
          const tickers = payload.tickers || [];
          
          // Clear old subscriptions for this client
          clientSubscriptions.forEach(key => {
            exchangeSubscribers.get(key)?.delete(clientWs);
            tickerSubscribers.get(key)?.delete(clientWs);
          });
          clientSubscriptions.clear();

          configs.forEach((cfg: any) => {
            const configKey = `${cfg.exchange}:${cfg.marketType}`;
            clientSubscriptions.add(configKey);
            
            if (!exchangeSubscribers.has(configKey)) {
              exchangeSubscribers.set(configKey, new Set());
            }
            exchangeSubscribers.get(configKey)!.add(clientWs);
            
            // Ensure the shared socket exists
            const ws = getExchangeSocket(cfg);

            // Handle tickers if provided in initial connect
            const relevantTickers = tickers.filter((t: any) => t.exchange === cfg.exchange && t.marketType === cfg.marketType);
            if (relevantTickers.length > 0) {
              if (!tickerSubscribers.has(configKey)) {
                tickerSubscribers.set(configKey, new Set());
              }
              tickerSubscribers.get(configKey)!.add(clientWs);

              if (cfg.exchange.startsWith('Bybit')) {
                subscribeTickersBybit(ws, cfg.exchange, cfg.marketType, relevantTickers);
              } else if (cfg.exchange.startsWith('Binance')) {
                subscribeTickersBinance(ws, cfg.exchange, cfg.marketType, relevantTickers);
              }
            }

            // Send cached snapshots immediately to the new client
            if (cfg.exchange.startsWith('Bybit') || cfg.exchange.startsWith('Binance')) {
              const prefix = `${configKey}:`;
              snapshotCache.forEach((snapshot, key) => {
                if (key.startsWith(prefix)) {
                  clientWs.send(JSON.stringify({
                    type: "EXCHANGE_DATA",
                    dataType: "DEPTH",
                    exchange: cfg.exchange,
                    marketType: cfg.marketType,
                    data: snapshot
                  }));
                }
              });
            }
          });
        }

        if (payload.type === "SUBSCRIBE_TICKERS") {
          const tickers = payload.tickers;
          tickers.forEach((t: any) => {
            const configKey = `${t.exchange}:${t.marketType}`;
            if (!tickerSubscribers.has(configKey)) {
              tickerSubscribers.set(configKey, new Set());
            }
            tickerSubscribers.get(configKey)!.add(clientWs);
            clientSubscriptions.add(configKey);

            // Find or create the exchange socket
            // We need the full config to create it if it doesn't exist
            // For now assume it exists or we have enough info
            // Actually we should probably have a way to get the base URL
            const ws = globalExchangeSockets.get(configKey);
            if (ws) {
              if (t.exchange.startsWith('Bybit')) {
                subscribeTickersBybit(ws, t.exchange, t.marketType, [t]);
              } else if (t.exchange.startsWith('Binance')) {
                subscribeTickersBinance(ws, t.exchange, t.marketType, [t]);
              }
            }
          });
        }
      } catch (e) {
        console.error("[WS Proxy] Error parsing message:", e);
      }
    });

    clientWs.on("close", () => {
      console.log("[WS Proxy] Client disconnected");
      clientSubscriptions.forEach(key => {
        exchangeSubscribers.get(key)?.delete(clientWs);
      });
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
