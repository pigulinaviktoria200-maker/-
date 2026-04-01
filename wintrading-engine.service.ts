
import { Subject, BehaviorSubject } from 'rxjs';
import {
  RowData,
  SettingsState,
  Density,
  Side,
  OrderBookLevel,
  OrderBookEntry,
  MarketType,
  ExchangeConfig,
  SymbolState,
  DensityType
} from '../models';

export const CONFIG = {
  engineTickMs: 500,
  MOVE_TOLERANCE_PCT: 0.0005, 
  TTL_MS: 10000, // 10 seconds TTL for flickering densities
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes for deep cleanup
  DEPTH_UPDATE_TICKS: 3, // Update depth slice every 3 ticks
};

const safeFloat = (val: any, def: number) => {
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? def : n;
};

const safeInt = (val: any, def: number) => {
  const n = parseInt(String(val));
  return isNaN(n) ? def : n;
};

export class WintradingEngineService {
  public longs$ = new Subject<RowData[]>();
  public shorts$ = new Subject<RowData[]>();
  public socketCount$ = new BehaviorSubject<number>(0);
  public error$ = new Subject<{ exchange: string, marketType: string, message: string, isRegionalBlock: boolean }>();

  private marketState: Record<string, SymbolState> = {};
  private activeDensities = new Map<string, Density>();
  private rankMap: Record<string, number> = {};
  private proxySocket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private activeConfigs: ExchangeConfig[] = [];
  private tickerConfigs: { symbol: string, exchange: string, marketType: MarketType }[] = [];
  private tickCounter = 0;
  private lastDeepCleanup = Date.now();

  public ticker$ = new Subject<{ symbol: string, price: number, exchange: string, marketType: MarketType }>();

  public setRankMap(map: Record<string, number>) {
    this.rankMap = map;
  }
  private pipelineIntervalId: any = null;
  private settingsGetter: ((m: MarketType) => SettingsState) | null = null;

  private getNormalizedExchangeName(exchange: string, marketType: MarketType) {
    if (exchange.includes('Binance')) return `Binance ${marketType === 'SPOT' ? 'Spot' : 'Futures'}`;
    if (exchange.includes('Bybit')) return `Bybit ${marketType === 'SPOT' ? 'Spot' : 'Futures'}`;
    return exchange;
  }

  private getStateKey(symbol: string, exchange: string, marketType: MarketType) {
    const normalizedEx = this.getNormalizedExchangeName(exchange, marketType);
    return `${normalizedEx}:${marketType}:${symbol.toUpperCase()}`;
  }

  public connectExchanges(configs: ExchangeConfig[]) {
    this.activeConfigs = configs;
    this.disconnectAll();

    const activeExchangeNames = new Set(configs.map(c => this.getNormalizedExchangeName(c.exchange, c.marketType)));
    
    Object.keys(this.marketState).forEach(key => {
       const [ex] = key.split(':');
       if (!activeExchangeNames.has(ex)) {
         delete this.marketState[key];
       }
    });

    for (const [key, density] of this.activeDensities.entries()) {
       if (!activeExchangeNames.has(density.exchange)) {
         this.activeDensities.delete(key);
       }
    }

    this.connectToProxy();

    if (!this.pipelineIntervalId) {
      this.pipelineIntervalId = setInterval(() => this.engineTick(), CONFIG.engineTickMs);
    }
  }

  private connectToProxy() {
    if (this.proxySocket) {
      this.proxySocket.onopen = null;
      this.proxySocket.onclose = null;
      this.proxySocket.onerror = null;
      this.proxySocket.onmessage = null;
      this.proxySocket.close();
    }

    // Use configurable proxy URL if provided, otherwise fallback to current host
    const proxyUrl = (import.meta as any).env?.VITE_WS_PROXY_URL;
    let wsUrl: string;

    if (proxyUrl) {
      wsUrl = proxyUrl;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      this.proxySocket = ws;

      ws.onopen = () => {
        console.log("[Engine] Connected to Backend Proxy");
        this.socketCount$.next(1);
        ws.send(JSON.stringify({
          type: "CONNECT_EXCHANGES",
          configs: this.activeConfigs,
          tickers: this.tickerConfigs
        }));
      };

      ws.onclose = () => {
        console.warn("[Engine] Proxy connection closed. Reconnecting in 3s...");
        this.socketCount$.next(0);
        this.scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error("[Engine] Proxy connection error:", err);
        this.scheduleReconnect();
      };

      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.type === "EXCHANGE_ERROR") {
            this.error$.next({
              exchange: payload.exchange,
              marketType: payload.marketType,
              message: payload.message,
              isRegionalBlock: !!payload.isRegionalBlock
            });
            return;
          }
          if (payload.type === "EXCHANGE_DATA") {
            const { exchange, marketType, data } = payload;
            
            // Handle Ticker Data
            if (payload.dataType === 'TICKER') {
              const symbol = (data.s || data.symbol || data.data?.s || data.topic?.split('.').pop())?.toUpperCase();
              const price = parseFloat(data.c || data.lastPrice || data.data?.lastPrice || data.p);
              if (symbol && !isNaN(price)) {
                this.ticker$.next({ symbol, price, exchange, marketType });
              }
              return;
            }

            // Extract symbol generically
            const rawSymbol = data.s || data.symbol || data.data?.s || 
                             (data.topic?.split('.').pop()) || 
                             (typeof data.stream === 'string' ? data.stream.split('@')[0] : null);
            
            if (!rawSymbol) return;
            const symbol = String(rawSymbol).toUpperCase();
            
            const key = this.getStateKey(symbol, exchange, marketType);
            this.ensureStateExists(key, symbol, { exchange, marketType } as any);
            const state = this.marketState[key];

            // Sequence and Snapshot handling
            const isSnapshot = data.type === 'snapshot';
            const seq = data.data?.u || data.u || data.ts || data.E;

            if (isSnapshot) {
              state.lastSeq = seq;
              state.isReady = true;
            } else if (exchange.startsWith('Bybit')) {
              // Bybit specific: ignore deltas before snapshot
              if (!state.isReady) return;
              if (state.lastSeq && seq <= state.lastSeq) return;
              state.lastSeq = seq;
            } else {
              // Binance or others: assume ready or handle sequence if needed
              state.isReady = true;
              if (state.lastSeq && seq <= state.lastSeq) return;
              state.lastSeq = seq;
            }

            state.lastUpdate = Date.now();
            const depthData = data.data || data;
            
            this.parseDepth(state, depthData, { 
              exchange, 
              marketType, 
              isSnapshot 
            } as any);
            
            this.updateMidPrice(state);
          }
        } catch (e) {
          console.error("[Engine] Error parsing proxy message:", e);
        }
      };
    } catch (e) {
      console.error("[Engine] Failed to create proxy socket:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectToProxy();
    }, 3000);
  }

  private ensureStateExists(key: string, symbol: string, cfg: ExchangeConfig) {
    if (!this.marketState[key]) {
      const exchangeName = this.getNormalizedExchangeName(cfg.exchange, cfg.marketType);
      this.marketState[key] = {
        symbol: symbol.toUpperCase(),
        exchange: exchangeName,
        marketType: cfg.marketType, 
        asks: new Map(), bids: new Map(), currentPrice: 0, 
        lastUpdate: Date.now(), isReady: false, cleaned: false
      };
    }
  }

  private updateSocketCount() {
    const active = this.proxySocket?.readyState === WebSocket.OPEN ? 1 : 0;
    this.socketCount$.next(active);
  }

  public disconnectAll() {
    this.tickerConfigs = [];
    if (this.proxySocket) {
      this.proxySocket.onopen = null;
      this.proxySocket.onclose = null;
      this.proxySocket.onerror = null;
      this.proxySocket.onmessage = null;
      this.proxySocket.close();
      this.proxySocket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    for (const key in this.marketState) {
      const state = this.marketState[key];
      state.asks.clear();
      state.bids.clear();
    }
    this.marketState = {};
    this.activeDensities.clear();
    
    this.updateSocketCount();
  }

  private clearDataForExchange(exchange: string, marketType: MarketType) {
    const normalizedEx = this.getNormalizedExchangeName(exchange, marketType);
    
    Object.keys(this.marketState).forEach(key => {
      const state = this.marketState[key];
      if (state.exchange === normalizedEx && state.marketType === marketType) {
        state.asks.clear();
        state.bids.clear();
        delete this.marketState[key];
      }
    });

    for (const [key, density] of this.activeDensities.entries()) {
      if (density.exchange === normalizedEx && density.marketType === marketType) {
        this.activeDensities.delete(key);
      }
    }
  }

  private parseDepth(state: SymbolState, data: any, cfg: ExchangeConfig) {
    const MAX_LEVELS_PER_SIDE = 2500; 
    const MAX_BOOK_DIST_PCT = 0.05; 
    
    const update = (map: Map<number, number>, arr: any[], side: Side) => {
      if (!arr) return;
      if (cfg.isSnapshot) {
        map.clear();
        if (side === 'bid') state.bestBid = 0;
        else state.bestAsk = Infinity;
      }
      
      const mid = state.currentPrice;
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        let price, qty;
        if (Array.isArray(item)) {
          price = +item[0]; qty = +item[1];
        } else {
          price = +item.price; 
          qty = item.size !== undefined ? +item.size : +item.qty;
        }

        if (mid > 0 && Math.abs(price - mid) / mid > MAX_BOOK_DIST_PCT) { 
          map.delete(price); 
          continue; 
        }
        
        if (qty === 0) {
          map.delete(price);
          if (side === 'bid' && price === state.bestBid) state.bestBid = 0;
          if (side === 'ask' && price === state.bestAsk) state.bestAsk = Infinity;
        } else {
          map.set(price, qty);
          if (side === 'bid') {
            if (price > (state.bestBid || 0)) state.bestBid = price;
          } else {
            if (price < (state.bestAsk || Infinity)) state.bestAsk = price;
          }
        }
      }
      
      if (!state.cleaned && mid > 0) {
        for (const [p] of map) {
          if (Math.abs(p - mid) / mid > MAX_BOOK_DIST_PCT) {
            map.delete(p);
            if (side === 'bid' && p === state.bestBid) state.bestBid = 0;
            if (side === 'ask' && p === state.bestAsk) state.bestAsk = Infinity;
          }
        }
        state.cleaned = true;
      }
      
      if (map.size > MAX_LEVELS_PER_SIDE) {
        const prices = [];
        for (const [p] of map) prices.push(p);
        if (side === 'bid') prices.sort((a, b) => b - a);
        else prices.sort((a, b) => a - b);
        
        for (let i = MAX_LEVELS_PER_SIDE; i < prices.length; i++) {
          map.delete(prices[i]);
        }
      }
    };

    update(state.asks, data.asks || data.a, 'ask');
    update(state.bids, data.bids || data.b, 'bid');
  }

  private updateMidPrice(state: SymbolState) {
    if (!state.bestBid || state.bestBid === 0) {
      let b = 0;
      for (const [p] of state.bids) { if (p > b) b = p; }
      state.bestBid = b;
    }
    if (!state.bestAsk || state.bestAsk === Infinity) {
      let a = Infinity;
      for (const [p] of state.asks) { if (p < a) a = p; }
      state.bestAsk = a;
    }

    if (state.bestAsk !== Infinity && state.bestBid !== 0) {
      state.currentPrice = (state.bestAsk + state.bestBid) / 2;
    }
  }

  public startPipeline(interval = CONFIG.engineTickMs, settingsGetter?: (m: MarketType) => SettingsState) {
    this.settingsGetter = settingsGetter ?? null;
    this.stopPipeline();
    this.pipelineIntervalId = setInterval(() => this.engineTick(), interval);
  }

  public stopPipeline() {
    if (this.pipelineIntervalId) { clearInterval(this.pipelineIntervalId); this.pipelineIntervalId = null; }
  }

  private getTopNFromMap(map: Map<number, number>, currentPrice: number, maxDist: number, n: number): OrderBookLevel[] {
    const candidates: OrderBookLevel[] = [];
    for (const [price, qty] of map) {
      if (Math.abs(price - currentPrice) / currentPrice <= maxDist) {
        candidates.push({ price, qty, volume: price * qty });
      }
    }
    candidates.sort((a, b) => b.volume - a.volume);
    if (candidates.length > n) candidates.length = n;
    return candidates;
  }

  private getDepthSlice(map: Map<number, number>, targetPrice: number, side: Side, count: number = 8): OrderBookEntry[] {
    const entries: OrderBookLevel[] = [];
    for (const [price, qty] of map) {
      entries.push({ price, qty, volume: price * qty });
    }
    
    entries.sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice));
    const slice: OrderBookLevel[] = [];
    const limit = Math.min(entries.length, count);
    for (let i = 0; i < limit; i++) slice.push(entries[i]);

    if (side === 'bid') slice.sort((a, b) => b.price - a.price);
    else slice.sort((a, b) => a.price - b.price);
    
    let maxVol = 1;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].volume > maxVol) maxVol = slice[i].volume;
    }
    
    const result: OrderBookEntry[] = [];
    for (let i = 0; i < slice.length; i++) {
      const l = slice[i];
      result.push({
        price: l.price,
        volume: l.volume,
        relativeSize: l.volume / maxVol,
        isDensity: Math.abs(l.price - targetPrice) / targetPrice < 0.000001
      });
    }
    return result;
  }

  private calculateRD(candidateVol: number, allLevels: OrderBookLevel[], targetPrice: number, peerCount: number, minAbsVol: number): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < allLevels.length; i++) {
      const l = allLevels[i];
      if (Math.abs(l.price - targetPrice) / targetPrice > 0.000001) {
        sum += l.volume;
        count++;
        if (count >= peerCount) break;
      }
    }
    
    const avgRest = count > 0 ? (sum / count) : 0;
    const effectiveBaseline = Math.max(avgRest, minAbsVol);
    return candidateVol / (effectiveBaseline || 1);
  }

  private engineTick() {
    const now = Date.now();
    this.tickCounter++;

    // 1. Deep cleanup of stale densities every 60 seconds
    if (now - this.lastDeepCleanup > 60000) {
      for (const [id, density] of this.activeDensities) {
        if (now - density.lastUpdate > 60000) {
          this.activeDensities.delete(id);
        }
      }
      this.lastDeepCleanup = now;
    }
    
    for (const key in this.marketState) {
      try {
        const state = this.marketState[key];
        if (!state.currentPrice || !state.isReady) continue;

        // 2. Memory GC Hack: Recreate Maps when system is relatively idle
        if (this.activeDensities.size < 10) {
          state.asks = new Map(state.asks);
          state.bids = new Map(state.bids);
        }

        const settings = this.settingsGetter?.(state.marketType);
        if (!settings) continue;
        
        const isTuned = state.symbol === 'AAVEUSDT';
        const maxDist = isTuned ? 0.01 : (safeFloat(settings.distancePercentage, 2.0) / 100);
        const minAbsVol = safeFloat(settings.volumeFilter, 40000); 
        const minDensityVol = safeFloat(settings.minDensityVolume, 100000); 
        const peerMultiplier = safeFloat(settings.peerMultiplier, 2.5);
        const peerCount = Math.max(3, Math.min(50, safeInt(settings.peerCount, 6))); 
        const observeTime = safeInt(settings.densityObserveTimeMs, 10000);

        (['bid', 'ask'] as Side[]).forEach(side => {
          const map = side === 'bid' ? state.bids : state.asks;
          // Top-N: Only analyze top 500 levels by volume
          const topLevels = this.getTopNFromMap(map, state.currentPrice, maxDist, 500);
          
          if (topLevels.length > 0) {
            const candidate = topLevels[0];
            const currentRD = this.calculateRD(candidate.volume, topLevels, candidate.price, peerCount, minAbsVol);

            if (candidate.volume >= minDensityVol && currentRD >= peerMultiplier) {
              let density: Density | undefined;
              for (const d of this.activeDensities.values()) {
                if (d.pair === state.symbol.replace('USDT', '') && d.side === side && d.exchange === state.exchange && d.marketType === state.marketType) {
                  const pDiff = Math.abs(d.corePrice - candidate.price) / d.corePrice;
                  if (pDiff <= CONFIG.MOVE_TOLERANCE_PCT) {
                    density = d;
                    if (d.corePrice !== candidate.price) {
                       const oldKey = `${d.exchange}:${d.marketType}:${state.symbol}:${side}:${d.corePrice}`;
                       this.activeDensities.delete(oldKey);
                       d.corePrice = candidate.price;
                       d.price = candidate.price;
                       const newKey = `${d.exchange}:${d.marketType}:${state.symbol}:${side}:${candidate.price}`;
                       d.id = newKey;
                       this.activeDensities.set(newKey, d);
                    }
                    break;
                  }
                }
              }

              if (!density) {
                const pKey = `${state.exchange}:${state.marketType}:${state.symbol}:${side}:${candidate.price}`;
                density = {
                  id: pKey,
                  pair: state.symbol.replace('USDT', ''), exchange: state.exchange, marketType: state.marketType,
                  side, price: candidate.price, reactionPrice: candidate.price, vwapPrice: candidate.price, corePrice: candidate.price,
                  coreQty: candidate.qty, coreVolume: candidate.volume, clusterVolume: candidate.volume, maxSeenCoreVolume: candidate.volume,
                  maxSeenClusterVolume: candidate.volume, baseLocalMedian: minAbsVol, baseGlobalAvg: minAbsVol, initialRelativeVolume: currentRD,
                  globalRelative: currentRD, localRelative: currentRD, relativeVolume: currentRD, maxSeenRelativeVolume: currentRD,
                  clusterSize: 1, activeClusterSize: 1, createdAt: now, lastUpdate: now, lastVolumeSeenAt: now, calibrated: false,
                  tickCount: 0, rdMissCount: 0, confirmed: false, state: 'OBSERVE', alive: true, type: DensityType.SINGLE,
                  confidence: 100, isMoving: false
                };
                this.activeDensities.set(pKey, density);
              }

              if (density) {
                density.coreQty = candidate.qty;
                density.coreVolume = candidate.volume;
                density.relativeVolume = currentRD;
                // Update timestamp only if it's a valid density found in book
                density.lastUpdate = now;
                if (candidate.volume > density.maxSeenCoreVolume) density.maxSeenCoreVolume = candidate.volume;
                
                if (now - density.createdAt >= observeTime) {
                  density.state = 'ACTIVE';
                }
                
                // 3. Throttled depthSlice updates
                if (this.tickCounter % CONFIG.DEPTH_UPDATE_TICKS === 0) {
                  density.depthSlice = this.getDepthSlice(map, density.corePrice, side);
                }
              }
            }
          }
        });
      } catch (e) {}
    }

    const densitiesToDelete: string[] = [];
    for (const [pKey, density] of this.activeDensities) {
      const stateKey = this.getStateKey(density.pair + 'USDT', density.exchange, density.marketType);
      const state = this.marketState[stateKey];
      const settings = this.settingsGetter?.(density.marketType);
      
      if (!state || !settings) {
        densitiesToDelete.push(pKey);
        continue;
      }

      const map = density.side === 'bid' ? state.bids : state.asks;
      const currentQty = map.get(density.corePrice);
      
      // 4. TTL & Immediate Removal Logic
      if (currentQty === undefined) {
        // If price is gone, check TTL for flickering protection
        if (now - density.lastUpdate > CONFIG.TTL_MS) {
          densitiesToDelete.push(pKey);
        }
        continue;
      }

      const currentVol = currentQty * density.corePrice;
      const minDensityVol = safeFloat(settings.minDensityVolume, 100000);
      const degradationThreshold = safeFloat(settings.degradationThreshold, 0.7);

      if (currentVol < minDensityVol || currentVol < (density.maxSeenCoreVolume * degradationThreshold)) {
        densitiesToDelete.push(pKey);
        continue;
      }

      const isTuned = state.symbol === 'AAVEUSDT';
      const maxDist = isTuned ? 0.01 : (safeFloat(settings.distancePercentage, 2.0) / 100);
      if (Math.abs(density.corePrice - state.currentPrice) / state.currentPrice > maxDist) {
        densitiesToDelete.push(pKey);
        continue;
      }

      const topLevels = this.getTopNFromMap(map, state.currentPrice, maxDist, 500);
      const peerMultiplier = safeFloat(settings.peerMultiplier, 2.5);
      const peerCount = Math.max(3, safeInt(settings.peerCount, 6));
      const minAbsVol = safeFloat(settings.volumeFilter, 40000);
      const currentRD = this.calculateRD(currentVol, topLevels, density.corePrice, peerCount, minAbsVol);
      
      if (currentRD < peerMultiplier) {
        densitiesToDelete.push(pKey);
        continue;
      }

      density.coreQty = currentQty;
      density.coreVolume = currentVol;
      density.relativeVolume = currentRD;
      
      // Update TTL only when density is really there and passed all filters
      if (currentQty !== undefined) {
        density.lastUpdate = now;
      }

      if (this.tickCounter % CONFIG.DEPTH_UPDATE_TICKS === 0) {
        density.depthSlice = this.getDepthSlice(map, density.corePrice, density.side);
      }
    }

    for (let i = 0; i < densitiesToDelete.length; i++) {
      this.activeDensities.delete(densitiesToDelete[i]);
    }

    this.emitData();
  }

  public subscribeTicker(symbol: string, exchange: string, marketType: MarketType) {
    const exists = this.tickerConfigs.find(t => t.symbol === symbol && t.exchange === exchange && t.marketType === marketType);
    if (!exists) {
      this.tickerConfigs.push({ symbol, exchange, marketType });
      if (this.proxySocket?.readyState === WebSocket.OPEN) {
        this.proxySocket.send(JSON.stringify({
          type: "SUBSCRIBE_TICKERS",
          tickers: [{ symbol, exchange, marketType }]
        }));
      }
    }
  }

  public unsubscribeTicker(symbol: string, exchange: string, marketType: MarketType) {
    this.tickerConfigs = this.tickerConfigs.filter(t => !(t.symbol === symbol && t.exchange === exchange && t.marketType === marketType));
    if (this.proxySocket?.readyState === WebSocket.OPEN) {
      this.proxySocket.send(JSON.stringify({
        type: "UNSUBSCRIBE_TICKERS",
        tickers: [{ symbol, exchange, marketType }]
      }));
    }
  }

  private emitData() {
    const now = Date.now();
    const list: Density[] = [];
    for (const d of this.activeDensities.values()) {
      if (d.state === 'ACTIVE') list.push(d);
    }
    
    const longs: RowData[] = [];
    const shorts: RowData[] = [];

    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const state = this.marketState[this.getStateKey(d.pair + 'USDT', d.exchange, d.marketType)];
      const mid = state?.currentPrice || d.corePrice;
      const dist = ((d.corePrice - mid) / mid) * 100;
      
      const ageMinutes = (now - d.createdAt) / 60000;
      const rdFactor = Math.min(d.relativeVolume / 10, 1); 
      const ageFactor = Math.min(ageMinutes / 5, 1); 
      const rating = Math.round((rdFactor * 60) + (ageFactor * 40));

      const row: RowData = {
        id: d.id,
        pair: d.pair,
        price: d.corePrice,
        currentPrice: mid,
        reactionPrice: d.corePrice,
        coreQty: d.coreQty,
        rawVolume: d.coreVolume,
        percentage: dist.toFixed(4),
        side: d.side,
        exchange: d.exchange,
        marketType: d.marketType,
        relDensity: d.relativeVolume,
        state: d.state,
        type: d.type,
        isTuned: d.pair === 'AAVE',
        depth: d.depthSlice,
        rating: Math.max(10, Math.min(100, rating))
      };

      if (d.side === 'bid') longs.push(row);
      else shorts.push(row);
    }
    
    this.longs$.next(longs);
    this.shorts$.next(shorts);
  }
}
