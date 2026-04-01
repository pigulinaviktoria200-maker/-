
import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  AlertTriangle, ChevronDown, Check, Loader2, RefreshCw, 
  MousePointer2, Ruler, Magnet, Brush, Trash2, Circle as CircleIcon, BarChart2
} from 'lucide-react';
import { MarketType } from '../../models';
import { CustomChartEngine, Candle, Drawing } from './CustomChartEngine';

export interface MiniChartProps {
  symbol: string;
  timeframe: string;
  onTimeframeChange?: (tf: string) => void;
  isLong: boolean;
  price: number | string;
  currentPrice?: number | string;
  onOpen?: () => void;
  isExpanded?: boolean;
  marketType: MarketType;
  exchange?: string;
  children?: React.ReactNode; 
  height?: number; 
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  alerts?: {id: string, symbol: string, price: number, type: 'above' | 'below'}[];
  onAlertChange?: (alert: {id: string, symbol: string, price: number, type: 'above' | 'below'}) => void;
}

let globalRequestIndex = 0;

const CustomCrosshairIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrendLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="4" y1="20" x2="20" y2="4" />
    <circle cx="8" cy="16" r="2.5" fill="#080808" />
    <circle cx="16" cy="8" r="2.5" fill="#080808" />
  </svg>
);

const RayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="3" y1="21" x2="23" y2="1" />
    <circle cx="7" cy="17" r="2.5" fill="#080808" />
    <circle cx="14" cy="10" r="2.5" fill="#080808" />
  </svg>
);

const HLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="1" y1="12" x2="23" y2="12" />
    <circle cx="12" cy="12" r="2.5" fill="#080808" />
  </svg>
);

const HRayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="6" y1="12" x2="23" y2="12" />
    <circle cx="6" cy="12" r="2.5" fill="#080808" />
  </svg>
);

const VLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="12" y1="2" x2="12" y2="22" />
    <circle cx="12" cy="12" r="2.5" fill="#080808" />
  </svg>
);

const CrossLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <circle cx="12" cy="12" r="2.5" fill="#080808" />
  </svg>
);

export const MiniChart = React.memo(forwardRef<any, MiniChartProps>(({ symbol, timeframe, onTimeframeChange, isLong, price, currentPrice, onOpen, isExpanded, marketType, exchange, children, height, onHistoryChange, alerts = [], onAlertChange }, ref) => {
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  
  const [activeTool, setActiveTool] = useState<Drawing['type'] | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [resetViewCounter, setResetViewCounter] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const prevSymbolRef = useRef<string>(symbol);
  const prevTimeframeRef = useRef<string>(timeframe);
  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);
  const [loadedPartsCount, setLoadedPartsCount] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeVariant, setActiveVariant] = useState<any>(null);
  const drawingsRef = useRef<Drawing[]>([]);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  const [magnetEnabled, setMagnetEnabled] = useState(false);

  const [history, setHistory] = useState<Drawing[][]>([[]]);
  const [currentStep, setCurrentStep] = useState(0);

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  const numericCurrentPrice = currentPrice !== undefined 
    ? (typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice)
    : numericPrice;

  // Auto-scroll to present when in Live mode and new candles arrive
  // Removed redundant reset on every candle to prevent "jumping"
  // View is reset only on symbol/timeframe change or manual reset

  const handleResetView = () => {
    setIsLive(true);
    setResetViewCounter(prev => prev + 1);
  };
  
  const getBybitTimeframe = (tf: string) => {
    const map: Record<string, string> = {
      '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
      '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
      '1d': 'D', '1w': 'W', '1M': 'M'
    };
    return map[tf] || tf.replace('m', '');
  };

  const fetchPart = async (targetSymbol: string, isFut: boolean, useBybit: boolean, tf: string, endTime?: number) => {
    try {
      if (useBybit) {
        const category = isFut ? 'linear' : 'spot';
        const btf = getBybitTimeframe(tf);
        let url = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${targetSymbol.toUpperCase()}&interval=${btf}&limit=600`;
        if (endTime) url += `&end=${endTime}`;
        const resp = await fetch(url);
        if (resp.status === 429) return 'RATE_LIMIT';
        const json = await resp.json();
        if (json.retCode !== 0) return null;
        return { data: json.result?.list || null, source: 'BYBIT' };
      } else {
        const host = isFut ? 'fapi.binance.com' : 'api.binance.com';
        const path = isFut ? '/fapi/v1/klines' : '/api/v3/klines';
        let url = `https://${host}${path}?symbol=${targetSymbol.toUpperCase()}&interval=${tf}&limit=600`;
        if (endTime) url += `&endTime=${endTime}`;
        const resp = await fetch(url);
        if (resp.status === 429) return 'RATE_LIMIT';
        if (!resp.ok) return null;
        return { data: await resp.json(), source: 'BINANCE' };
      }
    } catch (e) { return null; }
  };

  const parseKlines = (data: any[], source: string): Candle[] => {
    if (source === 'BYBIT') {
      return data.map((d: any) => ({
        time: parseInt(d[0]), open: parseFloat(d[1]), high: parseFloat(d[2]), 
        low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]),
      })).reverse();
    }
    return data.map((d: any) => ({
      time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), 
      low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]),
    }));
  };

  const loadMoreHistory = useCallback(async () => {
    if (isFetchingMore || loadedPartsCount >= 5 || !activeVariant || candles.length === 0) return;
    
    setIsFetchingMore(true);
    try {
      const nextEnd = candles[0].time - 1;
      const res = await fetchPart(activeVariant.s, activeVariant.f, activeVariant.b, timeframe, nextEnd);
      
      if (res && res !== 'RATE_LIMIT' && Array.isArray(res.data) && res.data.length > 0) {
        const more = parseKlines(res.data, res.source);
        setCandles(prev => {
          const existingTimes = new Set(prev.map(c => c.time));
          const uniqueMore = more.filter(c => !existingTimes.has(c.time));
          return [...uniqueMore, ...prev].sort((a, b) => a.time - b.time);
        });
        setLoadedPartsCount(prev => prev + 1);
      }
    } catch (e) {
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, loadedPartsCount, activeVariant, candles, timeframe]);

  const handleScroll = useCallback((info?: { startIdx: number; totalCandles: number }) => {
    if (isLive) setIsLive(false);
    
    // Lazy load logic: if we are near the left edge (startIdx < 50)
    // and we haven't loaded all 5 parts yet, and not currently fetching
    if (info && info.startIdx < 50 && !isFetchingMore && loadedPartsCount < 5 && activeVariant) {
      loadMoreHistory();
    }
  }, [isLive, isFetchingMore, loadedPartsCount, activeVariant, loadMoreHistory]);

  const getTimeframeMs = (tf: string): number => {
    const unit = tf.slice(-1);
    const value = parseInt(tf.slice(0, -1));
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };

  useEffect(() => {
    if (!numericCurrentPrice || isNaN(numericCurrentPrice)) return;
    
    const tfMs = getTimeframeMs(timeframe);
    
    const updateCandles = () => {
      if (isSyncing) return;
      const now = Date.now();
      setCandles(prev => {
        if (prev.length === 0) {
          // Fallback: If no history, create initial candle to allow rendering
          const currentCandleTime = Math.floor(now / tfMs) * tfMs;
          return [{
            time: currentCandleTime,
            open: numericCurrentPrice,
            high: numericCurrentPrice,
            low: numericCurrentPrice,
            close: numericCurrentPrice,
            volume: 0
          }];
        }
        
        const last = prev[prev.length - 1];
        const nextCandleTime = last.time + tfMs;
        
        // Robust check: if current time passed the end of the last candle
        if (now >= nextCandleTime) {
          // New candle period started
          const newCandleTime = Math.floor(now / tfMs) * tfMs;
          
          // Avoid duplicate timestamps
          if (newCandleTime <= last.time) return prev;

          return [...prev, {
            time: newCandleTime,
            open: numericCurrentPrice,
            high: numericCurrentPrice,
            low: numericCurrentPrice,
            close: numericCurrentPrice,
            volume: 0
          }];
        } else {
          // Update existing candle
          const updatedLast = { ...last };
          updatedLast.close = numericCurrentPrice;
          updatedLast.high = Math.max(updatedLast.high, numericCurrentPrice);
          updatedLast.low = Math.min(updatedLast.low, numericCurrentPrice);
          
          // Check if anything actually changed to avoid unnecessary re-renders
          if (updatedLast.close === last.close && 
              updatedLast.high === last.high && 
              updatedLast.low === last.low) {
            return prev;
          }
          
          return [...prev.slice(0, -1), updatedLast];
        }
      });
    };

    updateCandles();
    
    // Run an interval to catch rollovers even if price doesn't move
    const interval = setInterval(updateCandles, 200);
    return () => clearInterval(interval);
  }, [numericCurrentPrice, timeframe, symbol, isSyncing]);

  useEffect(() => {
    let isDisposed = false;
    setFetchError(false);
    setIsSyncing(true);
    
    // Detect symbol change
    if (prevSymbolRef.current !== symbol) {
      setCandles([]);
      setResetViewCounter(prev => prev + 1);
      setIsLive(true);
      prevSymbolRef.current = symbol;
      setIsChangingTimeframe(false);
    }
    
    // Detect timeframe change
    if (prevTimeframeRef.current !== timeframe) {
      setIsChangingTimeframe(true);
      setResetViewCounter(prev => prev + 1);
      prevTimeframeRef.current = timeframe;
    }
    
    setLoadedPartsCount(1);
    setActiveVariant(null);

    const loadChartData = async () => {
      const myIndex = globalRequestIndex++;
      await new Promise(resolve => setTimeout(resolve, (myIndex % 50) * 80));
      if (isDisposed) return;

      try {
        const rawSymbol = symbol.replace(/[\/\s]/g, '').toUpperCase();
        const cleanBase = rawSymbol.replace(/USDT$/, '');
        // Fix regex order: longest first to avoid partial matches (e.g. 1000 matching first 4 digits of 1000000)
        const baseNoP = cleanBase.replace(/^(1000000|10000|1000)/, '');
        
        // Symbols that are known to cause issues or don't exist on Binance
        const SYMBOL_BLACKLIST = [
          '1000ENAUSDT', '1000SATSUSDT', '1000BONKUSDT', '1000RATSUSDT', 
          '1000CATIUSDT', '1000XUSDT', '1000000ENAUSDT', '10000ENAUSDT',
          '10000BTCUSDT', '10000LTCUSDT', '1000000LTCUSDT'
        ];

        const variants: { s: string, f: boolean, b: boolean }[] = [];
        const isBybit = exchange?.toLowerCase().includes('bybit');

        const fillVariants = (bybit: boolean) => {
          if (bybit) {
            // Bybit logic: supports prefixes
            variants.push({ s: rawSymbol, f: marketType === 'FUTURES', b: true });
            variants.push({ s: rawSymbol, f: marketType !== 'FUTURES', b: true });
            ['1000', '1000000', '10000'].forEach(p => {
              variants.push({ s: p + baseNoP + 'USDT', f: true, b: true });
              variants.push({ s: p + baseNoP + 'USDT', f: false, b: true });
            });
            variants.push({ s: baseNoP + 'USDT', f: false, b: true });
            variants.push({ s: baseNoP + 'USDT', f: true, b: true });
          } else {
            // Binance logic: NEVER uses prefixes like 1000, 1000000
            // We strictly use the base symbol without any leading digits that look like Bybit prefixes
            const binanceSymbol = baseNoP + 'USDT';
            variants.push({ s: binanceSymbol, f: marketType === 'FUTURES', b: false });
            variants.push({ s: binanceSymbol, f: marketType !== 'FUTURES', b: false });
          }
        };

        fillVariants(isBybit);
        fillVariants(!isBybit);

        const unique = variants.filter((v, i, s) => i === s.findIndex(t => t.s === v.s && t.f === v.f && t.b === v.b));

        let candlesFound: Candle[] = [];
        let variantUsed: any = null;

        for (const v of unique) {
          if (isDisposed) break;
          
          // Skip blacklisted symbols for Binance to avoid CORS/400 errors
          // Also skip any symbol for Binance that still starts with digits (likely a missed Bybit prefix)
          if (!v.b && (SYMBOL_BLACKLIST.includes(v.s) || /^\d+/.test(v.s))) continue;
          
          const res = await fetchPart(v.s, v.f, v.b, timeframe);
          if (res === 'RATE_LIMIT') { await new Promise(r => setTimeout(r, 600)); continue; }
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            candlesFound = parseKlines(res.data, res.source);
            variantUsed = v;
            break;
          }
        }

        if (isDisposed) return;

        if (candlesFound.length > 0) {
          setCandles(candlesFound);
          setActiveVariant(variantUsed);
          setIsSyncing(false);
          setIsChangingTimeframe(false);
        } else {
          // No history found after all variants
          setIsSyncing(false);
          setIsChangingTimeframe(false);
          // Only error if price is also missing
          if (!numericPrice) setFetchError(true);
        }
      } catch (err) {
        if (!isDisposed) { 
          setFetchError(true); 
          setIsSyncing(false); 
          setIsChangingTimeframe(false);
        }
      }
    };

    loadChartData();
    return () => { isDisposed = true; };
  }, [symbol, timeframe, marketType, retryCount, exchange]);

  const handleTfChange = (tf: string) => {
    onTimeframeChange?.(tf);
  };

  const pushToHistory = useCallback((newDrawings: Drawing[]) => {
    setHistory(prev => {
      const next = prev.slice(0, currentStep + 1);
      next.push(newDrawings);
      return next.length > 100 ? next.slice(1) : next;
    });
    setCurrentStep(prev => Math.min(prev + 1, 99));
    setDrawings(newDrawings);
  }, [currentStep]);

  const undo = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setDrawings(history[prevStep]);
    }
  }, [currentStep, history]);

  const redo = useCallback(() => {
    if (currentStep < history.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setDrawings(history[nextStep]);
    }
  }, [currentStep, history]);

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    canUndo: currentStep > 0,
    canRedo: currentStep < history.length - 1
  }), [undo, redo, currentStep, history.length]);

  useEffect(() => {
    onHistoryChange?.({
      canUndo: currentStep > 0,
      canRedo: currentStep < history.length - 1
    });
  }, [currentStep, history.length, onHistoryChange]);

  const onDrawingComplete = useCallback((drawing: Drawing) => {
    const nextDrawings = [...drawingsRef.current, drawing];
    pushToHistory(nextDrawings);
    if (activeTool !== 'brush') {
      setActiveTool(null);
    }
  }, [pushToHistory, activeTool]);

  const handleClearAll = () => {
    if (drawings.length > 0) {
      pushToHistory([]);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#020203] text-white relative overflow-hidden group/chart border border-purple-500/20 hover:border-purple-500/40 rounded-lg flex-col transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.1)]">
      
      <div className="flex-1 flex min-h-0 relative">
        <div className="w-8 sm:w-10 border-r border-white/10 bg-[#080808] flex flex-col items-center py-3 gap-2 shrink-0 z-50 overflow-y-auto no-scrollbar">
          <button 
            onClick={() => setActiveTool(null)}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === null 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <CustomCrosshairIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'brush' ? null : 'brush')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'brush' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <Brush size={14} className="sm:w-[16px] sm:h-[16px]" />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'trendline' ? null : 'trendline')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'trendline' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <TrendLineIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'ray' ? null : 'ray')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'ray' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <RayIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'circle' ? null : 'circle')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'circle' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <CircleIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'hline' ? null : 'hline')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'hline' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <HLineIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'hray' ? null : 'hray')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'hray' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <HRayIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'vline' ? null : 'vline')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'vline' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <VLineIcon />
          </button>

          <button 
            onClick={() => setActiveTool(activeTool === 'crossline' ? null : 'crossline')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'crossline' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <CrossLineIcon />
          </button>

          <div className="w-5 sm:w-6 h-[1px] bg-white/10 mx-1 shrink-0"></div>

          <button 
            onClick={() => setActiveTool(activeTool === 'ruler' ? null : 'ruler')}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              activeTool === 'ruler' 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <Ruler size={14} className="sm:w-[16px] sm:h-[16px]" />
          </button>

          <button 
            onClick={() => setMagnetEnabled(!magnetEnabled)}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              magnetEnabled 
              ? 'bg-zinc-700 text-white' 
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <Magnet size={14} className="sm:w-[16px] sm:h-[16px]" />
          </button>

          <button 
            onClick={handleResetView}
            title={isLive ? "Режим реального времени активен" : "Перейти к текущему времени"}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all group/btn relative shrink-0 ${
              isLive ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:bg-white/5 hover:text-purple-400'
            }`}
          >
            <RefreshCw size={14} className={`${isSyncing && candles.length === 0 ? 'animate-spin' : ''} sm:w-[16px] sm:h-[16px]`} />
            {isLive && <div className="absolute top-1 right-1 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500 rounded-full animate-pulse" />}
            <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none whitespace-nowrap z-[100] border border-white/10 shadow-xl transition-opacity">
              {isLive ? 'Режим LIVE' : 'К текущему времени'}
            </div>
          </button>

          <button 
            onClick={handleClearAll}
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all mt-1 shrink-0 ${
              drawings.length > 0 
              ? 'text-gray-500 hover:bg-red-500/10 hover:text-red-400' 
              : 'text-gray-700 opacity-10 cursor-not-allowed'
            }`}
          >
            <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>

        <div className="relative flex-1 bg-[#020203]">
          {fetchError ? (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <BarChart2 size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">График недоступен</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-[240px] leading-relaxed">
                Инструмент <span className="text-purple-400 font-bold">{symbol}</span> не предоставляет историю котировок на текущем шлюзе.
              </p>
              <button 
                onClick={() => setRetryCount(prev => prev + 1)} 
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20"
              >
                <RefreshCw size={14} /> Повторить поиск
              </button>
            </div>
          ) : (isSyncing && candles.length === 0) ? (
            <div className="absolute inset-0 z-20 bg-[#020203] flex flex-col items-center justify-center">
               <div className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Syncing Stream...</span>
            </div>
          ) : (
            <>
              {isChangingTimeframe && (
                <div className="absolute inset-0 z-30 bg-[#020203] flex flex-col items-center justify-center animate-in fade-in duration-200">
                   <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Updating Timeframe...</span>
                </div>
              )}
              <CustomChartEngine 
                data={candles} 
                isLong={isLong} 
                isExpanded={isExpanded} 
                height={height}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                magnetEnabled={magnetEnabled}
                onDrawingComplete={onDrawingComplete}
                onDrawingsChange={pushToHistory}
                drawings={drawings}
                timeframe={timeframe}
                currentPrice={numericPrice}
                resetViewTrigger={resetViewCounter}
                onScroll={handleScroll}
                alerts={alerts.filter(a => a.symbol === symbol)}
                onAlertChange={onAlertChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}));

export default MiniChart;
