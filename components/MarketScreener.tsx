
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Loader2, Star, ChevronUp, ChevronDown, Activity, GripHorizontal, Check, Sparkles, X, BookOpen, TrendingUp, Users, Globe, Zap, BrainCircuit, Plus, Bell } from 'lucide-react';
import { MiniChart } from './UI/MiniChart';
import { ExchangeLogo } from './UI/Shared';
import './QuantumCard.css';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Language, translations } from '../src/translations';
import { BINANCE_ICON, BYBIT_ICON } from '../src/constants';
import { WintradingEngineService } from '../services/wintrading-engine.service';

export interface MarketCoin {
  symbol: string;
  baseAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  market: 'SPOT' | 'FUTURES';
  exchange: 'Binance' | 'Bybit';
  logo: string;
}

type SortKey = 'price' | 'change' | 'volume' | 'none';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export const CustomUndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14l-4-4 4-4" />
    <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
  </svg>
);

export const CustomRedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14l4-4-4-4" />
    <path d="M19 10H8a4 4 0 1 0 0 8h1" />
  </svg>
);

const GridViewIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
  </svg>
);

const ListViewIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
    <line x1="10" y1="6" x2="20" y2="6" />
    <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
    <line x1="10" y1="18" x2="20" y2="18" />
  </svg>
);

const FavoritesBar = React.memo(({ 
  favorites, 
  onSelect, 
  activeCoin,
  isLoading = false
}: { 
  favorites: MarketCoin[], 
  onSelect: (c: MarketCoin) => void, 
  activeCoin: MarketCoin | null,
  isLoading?: boolean
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (favorites.length === 0 && !isLoading) return null;

  return (
    <div className="h-[36px] border-b border-purple-500/20 bg-[#050505] flex items-center shrink-0 z-[115] relative overflow-hidden">
      <div className="flex items-center px-3 border-r border-white/10 h-6 shrink-0">
        <Star size={14} className={`${isLoading ? 'text-zinc-700 animate-pulse' : 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]'}`} />
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center gap-2 px-3">
          <div className="h-4 w-16 bg-white/5 rounded-full animate-pulse" />
          <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse" />
          <div className="h-4 w-14 bg-white/5 rounded-full animate-pulse" />
        </div>
      ) : (
        <div 
          ref={scrollRef}
          className="flex-1 flex items-center gap-1.5 px-3 overflow-x-auto custom-scroll scroll-smooth"
        >
          {favorites.map(coin => {
            const isActive = activeCoin?.symbol === coin.symbol && activeCoin?.market === coin.market && activeCoin?.exchange === coin.exchange;
            const isPositive = coin.change24h >= 0;
            
            return (
              <div 
                key={`${coin.exchange}-${coin.market}-${coin.symbol}`}
                onClick={() => onSelect(coin)}
                className={`flex items-center gap-2 px-2 py-1 rounded-xl border transition-all duration-300 cursor-pointer whitespace-nowrap group relative ${
                  isActive 
                  ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                  : 'bg-[#0a0a0a] border-white/5 hover:border-purple-500/30 hover:bg-white/[0.02]'
                }`}
              >
                {/* Coin Icon with Ring */}
                <div className={`w-6 h-6 rounded-full p-0.5 border flex items-center justify-center transition-colors ${
                  isActive ? 'border-purple-500' : 'border-white/10 group-hover:border-purple-500/30'
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
                    <img src={`/api/logos/${coin.baseAsset.toUpperCase()}`} className="w-full h-full object-contain" alt="" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                    {coin.baseAsset}
                  </span>
                  <span className={`text-[10px] font-black font-mono ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3355]'}`}>
                    {isPositive ? '+' : ''}{coin.change24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export const FavoriteStar = React.memo(({ 
  coin, 
  isInitialFavorite, 
  onToggle,
  size = 16
}: { 
  coin: MarketCoin, 
  isInitialFavorite: boolean, 
  onToggle: (e: React.MouseEvent, coin: MarketCoin) => void,
  size?: number
}) => {
  const [isFav, setIsFav] = useState(isInitialFavorite);

  // Sync with prop if it changes from outside (e.g. data refresh or other component toggle)
  useEffect(() => {
    setIsFav(isInitialFavorite);
  }, [isInitialFavorite]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFav(!isFav); // Immediate visual feedback
    onToggle(e, coin);
  };

  return (
    <button 
      onClick={handleClick}
      className="transition-all hover:scale-125 p-1"
    >
      <Star 
        size={size} 
        className={`transition-all ${isFav ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-zinc-500 hover:text-zinc-300"}`} 
      />
    </button>
  );
});

const CoinLogo = React.memo(({ baseAsset, size = "w-16 h-16", padding = "p-3" }: { baseAsset: string; size?: string; padding?: string }) => {
  const [error, setError] = useState(false);
  const src = `/api/logos/${baseAsset.toUpperCase()}`;

  // Deterministic background color for placeholder
  const getPlaceholderBg = (symbol: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500'];
    const index = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className={`${size} rounded-full bg-[#050505] flex items-center justify-center overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl group-hover:border-purple-500/30 transition-all duration-500 relative`}>
      {!error ? (
        <img 
          src={src} 
          alt="" 
          className={`w-full h-full object-contain ${padding} group-hover:scale-110 transition-transform duration-500`} 
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white font-bold text-xs ${getPlaceholderBg(baseAsset)}`}>
          {baseAsset.slice(0, 2).toUpperCase()}
        </div>
      )}
      
      {/* Subtle hardware-like glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
    </div>
  );
});

const Sparkline = React.memo(({ symbol, exchange, market, isLong }: { symbol: string, exchange: string, market: string, isLong: boolean }) => {
  const [points, setPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSparkline = async () => {
      try {
        // Add a small random delay to stagger requests and avoid rate limits
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        
        if (!isMounted) return;

        let url = '';
        if (exchange === 'Binance') {
          url = market === 'SPOT' 
            ? `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`
            : `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=24`;
        } else {
          url = `https://api.bybit.com/v5/market/kline?category=${market === 'SPOT' ? 'spot' : 'linear'}&symbol=${symbol}&interval=60&limit=24`;
        }

        const res = await fetch(url);
        const data = await res.json();
        
        if (!isMounted) return;

        let closePrices: number[] = [];
        if (exchange === 'Binance') {
          closePrices = data.map((d: any) => parseFloat(d[4]));
        } else {
          closePrices = data.result.list.map((d: any) => parseFloat(d[4])).reverse();
        }
        setPoints(closePrices);
        setLoading(false);
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    };

    fetchSparkline();
    return () => { isMounted = false; };
  }, [symbol, exchange, market]);

  if (loading || points.length < 2) return <div className="w-full h-full opacity-10 bg-white/5 rounded animate-pulse" />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const pathData = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const color = isLong ? '#00ff88' : '#ff3355';

  return (
    <div className="w-full h-full relative group/spark">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        {/* Outer Glow Layer */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30"
          style={{ filter: 'blur(3px)' }}
        />
        {/* Inner Glow Layer */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 2px ${color})` }}
        />
      </svg>
      <span className="absolute bottom-[-8px] right-0 text-[10px] font-black text-zinc-600 uppercase tracking-tighter group-hover/spark:text-zinc-400 transition-colors">24h</span>
    </div>
  );
});

import { MarketSidebar } from './MarketSidebar';
import { AIBookModal } from './AIBookModal';

export interface MarketScreenerProps {
  language?: Language;
  previewCoin: MarketCoin | null;
  setPreviewCoin: React.Dispatch<React.SetStateAction<MarketCoin | null>>;
  timeframe: string;
  setTimeframe: React.Dispatch<React.SetStateAction<string>>;
  miniChartRef?: React.RefObject<any>;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, coin: MarketCoin) => void;
  rankMap?: Record<string, number>;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  onOpenAI?: (coin: MarketCoin) => void;
  isAiModalOpen?: boolean;
  isMultiChart: boolean;
  setIsMultiChart: React.Dispatch<React.SetStateAction<boolean>>;
  alerts: { id: string; symbol: string; price: number; type: 'above' | 'below' }[];
  setAlerts: React.Dispatch<React.SetStateAction<{ id: string; symbol: string; price: number; type: 'above' | 'below' }[]>>;
  hideList?: boolean;
  engine: WintradingEngineService;
}

const MarketScreener: React.FC<MarketScreenerProps> = ({ 
  language = 'ru', 
  previewCoin, 
  setPreviewCoin, 
  timeframe, 
  setTimeframe,
  miniChartRef: externalMiniChartRef,
  favorites,
  onToggleFavorite,
  onHistoryChange,
  onOpenAI,
  isAiModalOpen = false,
  isMultiChart,
  setIsMultiChart,
  alerts,
  setAlerts,
  hideList = false,
  engine
}) => {
  const t = translations[language];
  const [data, setData] = useState<MarketCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, dir: SortDir }>({ key: 'volume', dir: 'desc' });
  const [isExchangeFilterOpen, setIsExchangeFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [activeExchanges, setActiveExchanges] = useState<Record<string, boolean>>({
    'Binance': true,
    'Bybit': true
  });
  const [activeTypes, setActiveTypes] = useState<Record<string, boolean>>({
    'SPOT': true,
    'FUTURES': true
  });
  const [viewMode, setViewMode] = useState('list' as ViewMode); 
  const [secondaryCoin, setSecondaryCoin] = useState<MarketCoin | null>(null);

  const handleAlertChange = useCallback((updatedAlert: any) => {
    setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
  }, []);
  const [triggeredAlert, setTriggeredAlert] = useState<{symbol: string, price: number} | null>(null);
  const [typeBtnRect, setTypeBtnRect] = useState<DOMRect | null>(null);
  const [exchangeBtnRect, setExchangeBtnRect] = useState<DOMRect | null>(null);
  const typeBtnRef = useRef<HTMLButtonElement>(null);
  const exchangeBtnRef = useRef<HTMLButtonElement>(null);

  // Update rects when dropdowns open or on scroll/resize
  useEffect(() => {
    const updateRects = () => {
      if (isTypeFilterOpen && typeBtnRef.current) {
        setTypeBtnRect(typeBtnRef.current.getBoundingClientRect());
      }
      if (isExchangeFilterOpen && exchangeBtnRef.current) {
        setExchangeBtnRect(exchangeBtnRef.current.getBoundingClientRect());
      }
    };

    if (isTypeFilterOpen || isExchangeFilterOpen) {
      updateRects();
      // Use capture phase to catch scrolls in the header
      window.addEventListener('scroll', updateRects, true);
      window.addEventListener('resize', updateRects);
    }

    return () => {
      window.removeEventListener('scroll', updateRects, true);
      window.removeEventListener('resize', updateRects);
    };
  }, [isTypeFilterOpen, isExchangeFilterOpen]);

  // Close dropdowns on main window scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isTypeFilterOpen) setIsTypeFilterOpen(false);
      if (isExchangeFilterOpen) setIsExchangeFilterOpen(false);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isTypeFilterOpen, isExchangeFilterOpen]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [chartHeight, setChartHeight] = useState(550);
  const [isResizing, setIsResizing] = useState(false);
  const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortraitNow = height > width;
      setIsPortrait(isPortraitNow);

      // Responsive heights for tablet and mobile
      if (width < 768) { // Mobile
        setChartHeight(isPortraitNow ? 320 : 220);
      } else if (width < 1024) { // Tablet
        setChartHeight(isPortraitNow ? 600 : 500);
      } else if (isPortraitNow) {
        // For PC in portrait (unlikely but possible)
        setChartHeight(600);
      } else {
        // For PC in landscape, we don't want to reset if user manually resized it
        // But initially it should be 550.
        setChartHeight(prev => {
           // If it's the old default or one of the responsive values, set to 550
           if (prev === 380 || prev === 320 || prev === 220 || prev === 600 || prev === 500) return 550;
           return prev;
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const MAIN_TIMEFRAMES = ['1m', '15m', '1h'];
  const EXTRA_TIMEFRAMES = ['3m', '5m', '30m', '2h', '4h', '6h', '12h', '1d', '2d', '5d', '1w'];
  
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  
  const isFavorite = useCallback((coin: MarketCoin) => {
    return favoritesSet.has(`${coin.exchange}:${coin.market}:${coin.symbol}`);
  }, [favoritesSet]);

  const favoriteCoinsData = useMemo(() => {
    return data.filter(c => isFavorite(c));
  }, [data, isFavorite]);

  const currentPreviewRef = useRef<MarketCoin | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const exchangeDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const localMiniChartRef = useRef<any>(null);
  const miniChartRef = externalMiniChartRef || localMiniChartRef;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exchangeDropdownRef.current && !exchangeDropdownRef.current.contains(event.target as Node)) {
        setIsExchangeFilterOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeFilterOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFavorite = onToggleFavorite;

  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      };

      const results = await Promise.allSettled([
        fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr'), 
        fetchWithTimeout('https://fapi.binance.com/fapi/v1/ticker/24hr'), 
        fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=spot'), 
        fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=linear'), 
      ]);

      const getTop50 = (list: MarketCoin[]) => {
        return list.sort((a, b) => b.volume24h - a.volume24h).slice(0, 50);
      };

      let bSpot: MarketCoin[] = [];
      if (results[0].status === 'fulfilled') {
        bSpot = results[0].value.filter((t: any) => t.symbol.endsWith('USDT')).map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return {
            symbol: t.symbol, baseAsset: base, price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.priceChangePercent), volume24h: parseFloat(t.quoteVolume),
            market: 'SPOT', exchange: 'Binance', logo: `/api/logos/${base.toUpperCase()}`
          } as MarketCoin;
        });
      }

      let bFut: MarketCoin[] = [];
      if (results[1].status === 'fulfilled') {
        bFut = results[1].value.filter((t: any) => t.symbol.endsWith('USDT')).map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return {
            symbol: t.symbol, baseAsset: base, price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.priceChangePercent), volume24h: parseFloat(t.quoteVolume),
            market: 'FUTURES', exchange: 'Binance', logo: `/api/logos/${base.toUpperCase()}`
          } as MarketCoin;
        });
      }

      let ySpot: MarketCoin[] = [];
      if (results[2].status === 'fulfilled') {
        ySpot = results[2].value.result.list.filter((t: any) => t.symbol.endsWith('USDT')).map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return {
            symbol: t.symbol, baseAsset: base, price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.price24hPcnt) * 100, volume24h: parseFloat(t.turnover24h),
            market: 'SPOT', exchange: 'Bybit', logo: `/api/logos/${base.toUpperCase()}`
          } as MarketCoin;
        });
      }

      let yFut: MarketCoin[] = [];
      if (results[3].status === 'fulfilled') {
        yFut = results[3].value.result.list.filter((t: any) => t.symbol.endsWith('USDT')).map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return {
            symbol: t.symbol, baseAsset: base, price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.price24hPcnt) * 100, volume24h: parseFloat(t.turnover24h),
            market: 'FUTURES', exchange: 'Bybit', logo: `/api/logos/${base.toUpperCase()}`
          } as MarketCoin;
        });
      }

      const allRawData = [...bSpot, ...bFut, ...ySpot, ...yFut];
      const top50s = [
        ...getTop50(bSpot),
        ...getTop50(bFut),
        ...getTop50(ySpot),
        ...getTop50(yFut)
      ];

      // Ensure all favorites are included in the data even if they are not in the top 50
      const currentFavs = favorites;
      const favoriteItems = allRawData.filter(c => 
        currentFavs.includes(`${c.exchange}:${c.market}:${c.symbol}`)
      );

      // Combine top 50s and favorites, removing duplicates
      const allData = [...top50s];
      favoriteItems.forEach(fav => {
        const alreadyExists = allData.some(d => 
          d.symbol === fav.symbol && d.market === fav.market && d.exchange === fav.exchange
        );
        if (!alreadyExists) {
          allData.push(fav);
        }
      });

      if (allData.length > 0) {
        setData(allData);
        
        if (!currentPreviewRef.current) {
            const btc = allData.find(c => c.symbol === 'BTCUSDT' && c.market === 'SPOT' && c.exchange === 'Binance');
            const defaultCoin = btc || allData[0] || null;
            setPreviewCoin(defaultCoin);
            currentPreviewRef.current = defaultCoin;
        } else {
          const updated = allData.find(c => c.symbol === currentPreviewRef.current?.symbol && c.market === currentPreviewRef.current?.market && c.exchange === currentPreviewRef.current?.exchange);
          if (updated) {
            setPreviewCoin(updated);
            currentPreviewRef.current = updated;
          }
        }
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Real-time price updates for the previewed coin via server proxy
  useEffect(() => {
    if (!previewCoin) return;
    
    // Subscribe to ticker via engine
    engine.subscribeTicker(previewCoin.symbol, previewCoin.exchange, previewCoin.market);
    
    // Listen for ticker updates
    const sub = engine.ticker$.subscribe(update => {
      if (update.symbol === previewCoin.symbol && 
          update.exchange === previewCoin.exchange && 
          update.marketType === previewCoin.market) {
        
        if (update.price && (!currentPreviewRef.current || update.price !== currentPreviewRef.current.price)) {
          setPreviewCoin(prev => prev ? { ...prev, price: update.price } : null);
          if (currentPreviewRef.current) currentPreviewRef.current.price = update.price;
        }
      }
    });
    
    return () => {
      sub.unsubscribe();
      engine.unsubscribeTicker(previewCoin.symbol, previewCoin.exchange, previewCoin.market);
    };
  }, [previewCoin?.symbol, previewCoin?.exchange, previewCoin?.market, engine]);

  // Handle secondary coin ticker if needed
  useEffect(() => {
    if (!secondaryCoin) return;
    
    engine.subscribeTicker(secondaryCoin.symbol, secondaryCoin.exchange, secondaryCoin.market);
    
    const sub = engine.ticker$.subscribe(update => {
      if (update.symbol === secondaryCoin.symbol && 
          update.exchange === secondaryCoin.exchange && 
          update.marketType === secondaryCoin.market) {
        
        setSecondaryCoin(prev => prev ? { ...prev, price: update.price } : null);
      }
    });
    
    return () => {
      sub.unsubscribe();
      engine.unsubscribeTicker(secondaryCoin.symbol, secondaryCoin.exchange, secondaryCoin.market);
    };
  }, [secondaryCoin?.symbol, secondaryCoin?.exchange, secondaryCoin?.market, engine]);

  const filteredAndSortedData = useMemo(() => {
    let result = data.filter(coin => {
      const matchesSearch = coin.symbol.toLowerCase().includes(search.toLowerCase());
      const matchesMarket = activeTypes[coin.market];
      const matchesExchange = activeExchanges[coin.exchange];
      return matchesSearch && matchesMarket && matchesExchange;
    });

    if (sortConfig.key !== 'none') {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortConfig.key === 'price') { valA = a.price; valB = b.price; }
        else if (sortConfig.key === 'change') { valA = a.change24h; valB = b.change24h; }
        else if (sortConfig.key === 'volume') { valA = a.volume24h; valB = b.volume24h; }
        return sortConfig.dir === 'desc' ? valB - valA : valA - valB;
      });
    }

    return result;
  }, [data, search, sortConfig, activeExchanges, activeTypes]);

  useEffect(() => {
    if (alerts.length === 0) return;
    
    const checkAlerts = (coin: MarketCoin) => {
      const triggered = alerts.find(alert => {
        if (alert.symbol !== coin.symbol) return false;
        if (alert.type === 'above' && coin.price >= alert.price) return true;
        if (alert.type === 'below' && coin.price <= alert.price) return true;
        return false;
      });
      
      if (triggered) {
        // Play alert sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Error playing alert sound:", e));

        setTriggeredAlert({ symbol: triggered.symbol, price: triggered.price });
        setAlerts(prev => prev.filter(a => a.id !== triggered.id));
        
        // Auto-hide notification
        setTimeout(() => setTriggeredAlert(null), 5000);
      }
    };

    if (previewCoin) checkAlerts(previewCoin);
    if (secondaryCoin) checkAlerts(secondaryCoin);
  }, [previewCoin?.price, secondaryCoin?.price, alerts]);

  const toggleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key: 'none', dir: 'desc' };
    });
  };

  const toggleExchange = (ex: string) => {
    setActiveExchanges(prev => ({ ...prev, [ex]: !prev[ex] }));
  };

  const toggleType = (type: string) => {
    setActiveTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const selectCoin = useCallback((coin: MarketCoin, clearSearch = true, scrollToTop = false) => {
    if (isMultiChart && previewCoin && coin.symbol !== previewCoin.symbol) {
      setSecondaryCoin(coin);
    } else {
      setPreviewCoin(coin);
      currentPreviewRef.current = coin;
    }
    setIsSearchFocused(false);
    if (searchInputRef.current) searchInputRef.current.blur();
    if (clearSearch) setSearch(''); 
    if (scrollToTop && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAiModalOpen || filteredAndSortedData.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        const currentIndex = filteredAndSortedData.findIndex(c => 
          c.symbol === currentPreviewRef.current?.symbol && 
          c.market === currentPreviewRef.current?.market && 
          c.exchange === currentPreviewRef.current?.exchange
        );

        let nextIndex = 0;
        if (e.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % filteredAndSortedData.length;
        } else {
          nextIndex = (currentIndex - 1 + filteredAndSortedData.length) % filteredAndSortedData.length;
        }

        const nextCoin = filteredAndSortedData[nextIndex];
        if (nextCoin) {
          selectCoin(nextCoin, false, false); // Don't clear search, don't scroll to top
          
          // Scroll into view
          const id = `${nextCoin.exchange}-${nextCoin.market}-${nextCoin.symbol}`;
          const el = itemRefs.current.get(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredAndSortedData, isAiModalOpen, selectCoin]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !chartContainerRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      setChartHeight(Math.max(300, Math.min(800, newHeight)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const SortArrows = ({ columnKey }: { columnKey: SortKey }) => (
    <div className="flex flex-col -space-y-0.5 ml-1 shrink-0 opacity-80 group-hover:opacity-100">
      <ChevronUp 
        size={9} 
        strokeWidth={3}
        className={`transition-colors ${sortConfig.key === columnKey && sortConfig.dir === 'asc' ? 'text-purple-400' : 'text-zinc-500'}`} 
      />
      <ChevronDown 
        size={9} 
        strokeWidth={3}
        className={`transition-colors ${sortConfig.key === columnKey && sortConfig.dir === 'desc' ? 'text-purple-400' : 'text-zinc-500'}`} 
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#050505] text-gray-300 font-rajdhani overflow-x-auto border-t border-white/5 relative custom-scroll">
      
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto custom-scroll flex flex-col bg-[#050505] scroll-smooth ${isResizing ? 'select-none cursor-row-resize' : ''}`}
      >
        {/* ОБЛАСТЬ ГРАФИКА - ТЕПЕРЬ ВНУТРИ ПРОКРУТКИ */}
        <div 
          ref={chartContainerRef}
          className="relative flex flex-col border-b border-purple-500/20 bg-[#050505] shrink-0"
          style={{ height: `${chartHeight}px` }}
        >
          <FavoritesBar 
            favorites={favoriteCoinsData} 
            onSelect={(coin) => selectCoin(coin, false, false)} 
            activeCoin={previewCoin} 
            isLoading={loading && favorites.length > 0}
          />

          <div className="flex flex-row flex-1 overflow-hidden relative">
            <div className={`flex-1 relative overflow-hidden flex ${isMultiChart ? 'flex-col md:flex-row' : 'flex-col'}`}>
              <div className="flex-1 relative border border-purple-500/30 rounded-xl m-1.5 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                {previewCoin ? (
                  <MiniChart 
                    ref={miniChartRef}
                    key={`preview-${previewCoin.exchange}-${previewCoin.market}-${previewCoin.symbol}`}
                    symbol={previewCoin.symbol} 
                    timeframe={timeframe} 
                    onTimeframeChange={setTimeframe}
                    isLong={previewCoin.change24h >= 0} 
                    price={previewCoin.price} 
                    marketType={previewCoin.market} 
                    exchange={previewCoin.exchange}
                    isExpanded={true} 
                    height={favoriteCoinsData.length > 0 ? chartHeight - 52 : chartHeight} 
                    onHistoryChange={onHistoryChange}
                    alerts={alerts}
                    onAlertChange={handleAlertChange}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Activity size={64} className="animate-pulse text-gray-500" />
                  </div>
                )}
              </div>

              {isMultiChart && (
                <div className="flex-1 relative border border-purple-500/30 rounded-xl m-1.5 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)] animate-in slide-in-from-right duration-500">
                  {secondaryCoin ? (
                    <MiniChart 
                      key={`secondary-${secondaryCoin.exchange}-${secondaryCoin.market}-${secondaryCoin.symbol}`}
                      symbol={secondaryCoin.symbol} 
                      timeframe={timeframe} 
                      onTimeframeChange={setTimeframe}
                      isLong={secondaryCoin.change24h >= 0} 
                      price={secondaryCoin.price} 
                      marketType={secondaryCoin.market} 
                      exchange={secondaryCoin.exchange}
                      isExpanded={true} 
                      height={favoriteCoinsData.length > 0 ? chartHeight - 52 : chartHeight} 
                      alerts={alerts}
                      onAlertChange={handleAlertChange}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-black/40">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600">
                          <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select coin from list to compare</span>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => setIsMultiChart(false)}
                    className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg border border-white/10 transition-all z-[140]"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alert Notification Overlay */}
          {triggeredAlert && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
              <div className="bg-purple-600 text-white px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  <Bell size={20} className="fill-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest">Price Alert Triggered!</span>
                  <span className="text-sm font-bold">{triggeredAlert.symbol} reached ${triggeredAlert.price.toLocaleString()}</span>
                </div>
                <button onClick={() => setTriggeredAlert(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div 
            onMouseDown={handleResizeStart}
            className={`hidden md:flex absolute bottom-0 left-0 right-0 h-[6px] z-[130] cursor-row-resize items-center justify-center group/resize transition-all duration-300 ${
              isResizing ? 'bg-purple-600 shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-white/5 hover:bg-purple-500/40'
            }`}
          >
             <div className={`px-4 py-0.5 rounded-full flex items-center gap-1 transition-all duration-300 ${
               isResizing ? 'bg-white text-purple-600 scale-110 shadow-lg' : 'bg-[#111] text-gray-500 border border-white/10 group-hover/resize:text-white'
             }`}>
               <GripHorizontal size={10} strokeWidth={3} />
               <span className="text-8px font-black uppercase tracking-tighter">Resize</span>
             </div>
          </div>
        </div>

        {/* ЛЕНТА ИЗБРАННОГО */}

        {!hideList && (
          <div className="flex flex-col bg-[#050505] relative min-h-screen" id="market-feed-section">
            <div className="sticky top-0 bg-[#050505] border-b border-white/5 shadow-2xl z-[1000]">
              <div className="min-h-[44px] md:min-h-[56px] h-auto px-2 sm:px-4 py-3 flex flex-row flex-nowrap items-center gap-3 md:gap-4 shrink-0 relative z-[1010] overflow-x-auto no-scrollbar">
              {/* VIEW MODE PILL (IMAGE STYLE) */}
              <div className="flex items-center bg-black/40 border border-zinc-800 rounded-full p-0.5 shrink-0">
                <div className="flex items-center">
                  <button 
                     onClick={() => setViewMode('grid')}
                     className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-[#1a0b2e] text-zinc-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    <GridViewIcon size={12} />
                  </button>
                  <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />
                  <button 
                     onClick={() => setViewMode('list')}
                     className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-[#1a0b2e] text-zinc-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    <ListViewIcon size={12} />
                  </button>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div 
                ref={searchContainerRef}
                className={`relative group shrink-0 transition-all duration-500 ease-in-out bg-black/40 border rounded-full z-[1020] ${
                  isSearchFocused ? 'border-purple-500/50 bg-black/60' : 'border-zinc-800'
                } ${
                  isPortrait 
                  ? (isSearchExpanded ? 'flex-1 min-w-[150px]' : 'w-12 h-8 cursor-pointer') 
                  : 'flex-1 min-w-[180px] max-w-md'
                }`}
                onClick={() => {
                  if (isPortrait && !isSearchExpanded) setIsSearchExpanded(true);
                }}
                onDoubleClick={(e) => {
                  if (isPortrait && isSearchExpanded) {
                    e.stopPropagation();
                    setIsSearchExpanded(false);
                  }
                }}
              >
                <Search 
                  size={isPortrait && !isSearchExpanded ? 10 : 12} 
                  className={`absolute top-1/2 -translate-y-1/2 transition-all z-10 ${
                    isPortrait && !isSearchExpanded 
                    ? 'left-1/2 -translate-x-1/2' 
                    : 'left-3.5 translate-x-0'
                  } ${
                    isSearchFocused ? 'text-purple-400' : 'text-zinc-500'
                  }`} 
                />
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    if (isPortrait) setIsSearchExpanded(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={(!isPortrait || isSearchExpanded) ? "ПОИСК АКТИВА" : ""}
                  className={`w-full bg-transparent border-none rounded-full py-1.5 pl-10 pr-4 text-[10px] font-black uppercase tracking-[0.15em] text-white placeholder-zinc-600 focus:outline-none transition-all ${
                    isPortrait && !isSearchExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                />
              </div>

              {/* EXCHANGE FILTER PILL */}
              <div className="flex items-center bg-[#0a0a0a] border border-zinc-800 rounded-full p-0.5 shrink-0">
                <div className="relative" ref={exchangeDropdownRef}>
                  <button 
                    ref={exchangeBtnRef}
                    onClick={() => {
                      setIsExchangeFilterOpen(!isExchangeFilterOpen);
                      setIsTypeFilterOpen(false); 
                    }}
                    className={`text-[9px] md:text-[10px] uppercase tracking-[0.1em] font-black px-2 md:px-4 h-6 md:h-7 rounded-full transition-all flex items-center gap-2 group shrink-0 border ${
                      isExchangeFilterOpen 
                      ? 'bg-[#1a0b2e] border-purple-500/60 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">БИРЖИ</span>
                    </div>
                    <ChevronDown size={8} className={`transition-transform duration-300 ${isExchangeFilterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isExchangeFilterOpen && exchangeBtnRect && (
                    <div 
                      className="fixed mt-3 bg-[#0a0a0a] border border-zinc-500/40 p-1.5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(255,255,255,0.05)] z-[2000] w-48 animate-in fade-in slide-in-from-top-3 duration-300"
                      style={{ 
                        top: exchangeBtnRect.bottom, 
                        left: Math.min(exchangeBtnRect.left, window.innerWidth - 200) 
                      }}
                    >
                      <div className="space-y-1">
                        {(['Binance', 'Bybit'] as const).map(exName => (
                          <div 
                            key={exName} 
                            onClick={() => toggleExchange(exName)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all group ${
                              activeExchanges[exName] 
                              ? 'bg-black border-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                              : 'bg-black/40 border-white/5 hover:border-zinc-500/30 hover:bg-black'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ExchangeLogo exchange={exName} size="w-14 h-6" />
                              <span className={`text-[12px] font-black tracking-widest ${activeExchanges[exName] ? 'text-white' : 'text-gray-500'}`}>{exName}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              activeExchanges[exName] 
                              ? 'bg-zinc-800 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                              : 'bg-white/5 border border-white/10'
                            }`}>
                              {activeExchanges[exName] && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TYPE FILTER PILL */}
              <div className="flex items-center bg-[#0a0a0a] border border-zinc-800 rounded-full p-0.5 shrink-0">
                <div className="relative" ref={typeDropdownRef}>
                  <button 
                    ref={typeBtnRef}
                    onClick={() => {
                      setIsTypeFilterOpen(!isTypeFilterOpen);
                      setIsExchangeFilterOpen(false); 
                    }}
                    className={`text-[9px] md:text-[10px] uppercase tracking-[0.1em] font-black px-2 md:px-4 h-6 md:h-7 rounded-full transition-all flex items-center gap-2 group shrink-0 border ${
                      isTypeFilterOpen 
                      ? 'bg-[#1a0b2e] border-purple-500/60 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">
                        {Object.entries(activeTypes)
                          .filter(([_, v]) => v)
                          .map(([k]) => k === 'SPOT' ? 'СПОТ' : 'ФЬЮЧЕРСЫ')
                          .join('/') || 'НЕТ'}
                      </span>
                    </div>
                    <ChevronDown size={8} className={`transition-transform duration-300 ${isTypeFilterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTypeFilterOpen && typeBtnRect && (
                    <div 
                      className="fixed mt-3 bg-[#0a0a0a] border border-zinc-500/40 p-1.5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] z-[2000] w-48 animate-in fade-in slide-in-from-top-3 duration-300"
                      style={{ 
                        top: typeBtnRect.bottom, 
                        left: Math.min(typeBtnRect.left, window.innerWidth - 200) 
                      }}
                    >
                      <div className="space-y-1">
                        {[
                          { id: 'SPOT', name: 'СПОТ' },
                          { id: 'FUTURES', name: 'ФЬЮЧЕРС' }
                        ].map(type => (
                          <div 
                            key={type.id} 
                            onClick={() => toggleType(type.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all group ${
                              activeTypes[type.id] 
                              ? 'bg-black border-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                              : 'bg-black/40 border-white/5 hover:border-zinc-500/30 hover:bg-black'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center shrink-0 transition-all duration-300 qc-hud-market-type`}>
                                <span className="text-[9px] font-black uppercase tracking-[0.1em] font-mono leading-none">
                                  {type.name}
                                </span>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              activeTypes[type.id] 
                              ? 'bg-zinc-800 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                              : 'bg-white/5 border border-white/10'
                            }`}>
                              {activeTypes[type.id] && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SORTING PILL (IMAGE STYLE) */}
              <div className="flex items-center bg-black/40 border border-zinc-800 rounded-full p-0.5 shrink-0">
                <div className="flex items-center">
                  <button 
                    onClick={() => toggleSort('volume')}
                    className={`h-7 md:h-8 px-4 md:px-6 rounded-full flex items-center gap-2 transition-all duration-300 group/item border ${
                      sortConfig.key === 'volume' 
                      ? 'bg-[#1a0b2e] border-purple-500/50 text-zinc-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Объем</span>
                    <SortArrows columnKey="volume" />
                  </button>

                  <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />
                  
                  <button 
                    onClick={() => toggleSort('change')}
                    className={`h-7 md:h-8 px-3 md:px-5 rounded-full flex items-center gap-2 transition-all duration-300 group/item ${
                      sortConfig.key === 'change' 
                      ? 'bg-[#1a0b2e] text-zinc-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">24ч %</span>
                    <SortArrows columnKey="change" />
                  </button>

                  <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />

                  <button 
                    onClick={() => toggleSort('price')}
                    className={`h-7 md:h-8 px-3 md:px-5 rounded-full flex items-center gap-2 transition-all duration-300 group/item ${
                      sortConfig.key === 'price' 
                      ? 'bg-[#1a0b2e] text-zinc-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Цена</span>
                    <SortArrows columnKey="price" />
                  </button>
                </div>
              </div>

            </div>
          </div>

            {/* TABLE HEADER BLOCK */}
            {viewMode === 'list' && filteredAndSortedData.length > 0 && !loading && (
              <div className={`grid grid-cols-[24px_24px_36px_1fr_1.2fr_0.8fr_0.8fr] md:grid-cols-[30px_30px_50px_1.2fr_1fr_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[30px_30px_50px_1.2fr_1fr_1fr_1fr_1.1fr_1.5fr_1fr_1fr] gap-0 px-1.5 sm:px-3 mx-1 sm:mx-2 py-2 border-t border-white/5 bg-[#050505] relative z-10 border border-purple-500/20 rounded-2xl text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-white/40 font-rajdhani font-black items-stretch`}>
                <div className="relative flex items-center justify-center">
                  ★
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative flex items-center justify-center">
                  {t.rank_short}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="scale-75 sm:scale-100">Logo</span>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative flex items-center justify-center">
                  {t.asset}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative flex items-center justify-center">
                  {t.price}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative hidden md:flex items-center justify-center">
                  {t.volume}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="scale-90 sm:scale-100">{t.change24h}</span>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20 md:hidden" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20 hidden lg:block" />
                </div>
                <div className="relative hidden md:flex items-center justify-center">
                  {t.market}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative hidden lg:flex items-center justify-center">
                  {t.trend}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20" />
                </div>
                <div className="relative hidden md:flex items-center justify-center">
                  {t.exchange}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20 md:hidden" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-purple-500/20 hidden md:block" />
                </div>
                <div className="relative flex items-center justify-center">
                  AI
                </div>
              </div>
            )}
          <div className="flex-1">
            {loading && data.length === 0 ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6 pb-24" : "w-full pb-24"}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`animate-pulse bg-white/[0.02] border border-white/5 rounded-xl ${viewMode === 'grid' ? 'h-[240px]' : 'h-[60px] mb-2 mx-4 sm:mx-10'}`} />
                ))}
              </div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Search size={48} className="mb-4" />
                <span className="text-xl font-black uppercase tracking-widest">Ничего не найдено</span>
                <span className="text-xs mt-2">Попробуйте изменить фильтры или поиск</span>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mobile-landscape-2-col gap-3 p-2 sm:p-3 pb-24">
                {filteredAndSortedData.map((coin, idx) => {
                    const isActive = previewCoin?.symbol === coin.symbol && previewCoin?.market === coin.market && previewCoin?.exchange === coin.exchange;
                    return (
                      <div 
                        key={`${coin.exchange}-${coin.market}-${coin.symbol}`}
                        ref={el => {
                          const id = `${coin.exchange}-${coin.market}-${coin.symbol}`;
                          if (el) itemRefs.current.set(id, el);
                          else itemRefs.current.delete(id);
                        }}
                        onClick={() => selectCoin(coin)}
                        data-active={isActive}
                        className={`group flex flex-col h-full p-4 cursor-pointer relative transition-all duration-300 hover:z-10 rounded-2xl border ${
                          isActive
                          ? 'bg-[#020202] border-purple-500 shadow-[0_0_40px_rgba(139,92,246,0.2)] ring-1 ring-purple-500/40' 
                          : 'bg-[#030303] border-purple-500/30 hover:border-purple-500/50 hover:bg-[#060606] hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                        }`}
                        style={{
                          borderWidth: '1px'
                        }}
                      >
                        <div className="qc-hud-scanline opacity-20" />
                        
                        {/* ЗВЕЗДОЧКА */}
                        <div className="absolute top-4 right-4 z-20">
                          <FavoriteStar 
                            coin={coin} 
                            isInitialFavorite={isFavorite(coin)} 
                            onToggle={toggleFavorite} 
                            size={16}
                          />
                        </div>

                        <div className="flex items-start gap-3 sm:gap-4 mb-4">
                           <CoinLogo baseAsset={coin.baseAsset} size="w-12 h-12 sm:w-16 sm:h-16" padding="p-2 sm:p-3" />
                           
                           <div className="flex flex-col pt-0.5 sm:pt-1 flex-1">
                              <div className="flex items-center gap-1.5 mb-1 sm:mb-1.5">
                                <span className="text-[8px] sm:text-[9px] font-black text-zinc-600 font-mono tracking-tighter">#{idx + 1}</span>
                                <span className={`text-lg sm:text-xl font-black uppercase tracking-tight transition-colors leading-none ${isActive ? 'text-white' : 'text-white/70'}`}>
                                  {coin.baseAsset}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenAI) onOpenAI(coin);
                                  }}
                                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded border border-rose-500/30 bg-gradient-to-r from-purple-950/90 to-rose-900/90 hover:from-purple-900 hover:to-rose-800 transition-all group shadow-[0_0_10px_rgba(225,29,72,0.15)]"
                                >
                                  <BrainCircuit className="w-2.5 h-2.5 text-rose-400 group-hover:scale-110 transition-transform" />
                                  <span className="text-[9px] font-black text-white/90 tracking-tighter uppercase">AI АНАЛИЗ</span>
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                 <ExchangeLogo exchange={coin.exchange} size="w-12 h-6 sm:w-16 sm:h-8" />
                                 <div className="w-[1px] h-3 bg-white/20 mx-0.5" />
                                 <div className={`flex items-center justify-center shrink-0 transition-all duration-300 qc-hud-market-type !text-[8px] sm:!text-[9px] text-white`}>
                                   <span className="font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] font-mono leading-none">
                                     {coin.market === 'FUTURES' ? 'ФЬЮЧЕРС' : 'СПОТ'}
                                   </span>
                                 </div>

                                  <div className="flex items-center gap-2 ml-auto">
                                    <div className="qc-logo-frame" style={{ filter: `drop-shadow(0 0 1px ${coin.change24h >= 0 ? '#00ff88' : '#ff3355'})` }}>
                                      <div className={`px-2 sm:px-4 h-6 sm:h-8 bg-black qc-logo-convex flex items-center justify-center shrink-0 transition-all duration-300 ${
                                        coin.change24h >= 0 ? 'text-[#00ff88]' : 'text-[#ff3355]'
                                      }`}>
                                        <span className="text-[8px] sm:text-[10px] font-black font-mono leading-none">
                                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="h-[1px] w-full bg-white/5 mb-4" />

                              <div className="flex items-center justify-between gap-3 relative z-10 hover:z-30">
                                <div className="bg-black/80 border border-white/10 px-3 py-1.5 rounded-xl shadow-inner">
                                  <span className={`text-lg sm:text-xl font-black font-mono tracking-tighter ${isActive ? 'text-white' : 'text-white/70'}`}>
                                    <span className="hidden lg:inline">
                                      ${coin.price < 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="lg:hidden inline">
                                      ${coin.price < 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex-1 h-8 sm:h-10 opacity-60">
                                   <Sparkline symbol={coin.symbol} exchange={coin.exchange} market={coin.market} isLong={coin.change24h >= 0} />
                                </div>
                              </div>
                          </div>
                      </div>
                    );
                })}
              </div>
            ) : (
              <div className="w-full font-mono pb-24 overflow-x-auto custom-scroll">
                {filteredAndSortedData.map((coin, idx) => {
                  const isActive = previewCoin?.symbol === coin.symbol && previewCoin?.market === coin.market && previewCoin?.exchange === coin.exchange;
                  return (
                    <div 
                      key={`${coin.exchange}-${coin.market}-${coin.symbol}`}
                      ref={el => {
                        const id = `${coin.exchange}-${coin.market}-${coin.symbol}`;
                        if (el) itemRefs.current.set(id, el);
                        else itemRefs.current.delete(id);
                      }}
                      onClick={() => selectCoin(coin)}
                      data-active={isActive}
                      className={`grid grid-cols-[24px_24px_36px_1fr_1.2fr_0.8fr_0.8fr] md:grid-cols-[30px_30px_50px_1.2fr_1fr_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[30px_30px_50px_1.2fr_1fr_1fr_1fr_1.1fr_1.5fr_1fr_1fr] gap-0 px-1.5 sm:px-3 mx-1 sm:mx-2 mb-2 items-stretch cursor-pointer transition-all duration-300 relative group/row rounded-2xl border ${
                        isActive 
                        ? 'bg-purple-500/10 border-purple-500/60 shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
                        : 'bg-black/40 border-purple-500/10 hover:bg-black/60 hover:border-purple-500/40'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute -left-1 top-2 bottom-2 w-1 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.8)] z-20" />
                      )}

                      {/* 0. FAVORITES */}
                      <div className="relative flex z-10 items-center justify-center py-2 sm:py-3">
                        <FavoriteStar 
                          coin={coin} 
                          isInitialFavorite={isFavorite(coin)} 
                          onToggle={toggleFavorite} 
                          size={16}
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 0.5 RANK */}
                      <div className="relative z-10 flex items-center justify-center py-2 sm:py-1">
                        <span className="text-[10px] sm:text-[10px] font-black text-white/40 font-mono tracking-tighter">
                          {idx + 1}
                        </span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 1. LOGO */}
                      <div className="relative z-10 flex items-center justify-center py-2 sm:py-1">
                        <CoinLogo baseAsset={coin.baseAsset} size="w-8 h-8 sm:w-7 sm:h-7" padding="p-1 sm:p-1" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>
                      
                      {/* 2. ASSET */}
                      <div className="relative z-10 flex flex-col justify-center items-center text-center px-1 py-2 sm:py-1">
                        <span className={`text-[12px] sm:text-[12px] font-black tracking-tight leading-none ${isActive ? 'text-white' : 'text-white/70'}`}>{coin.symbol}</span>
                        <span className="text-[6px] sm:text-[6px] text-zinc-700 uppercase font-black tracking-widest leading-none mt-0.5">{coin.exchange}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 3. PRICE */}
                      <div className={`relative z-10 flex items-center justify-center px-0.5 py-2 sm:py-1`}>
                        <div className="bg-black/80 border border-white/10 px-2 py-1 rounded-lg shadow-inner">
                          <span className={`text-[12px] sm:text-[13px] font-black font-mono leading-none ${isActive ? 'text-white' : 'text-white/95'}`}>
                            <span className="hidden lg:inline">
                              ${coin.price < 0.0001 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 }) : coin.price < 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="lg:hidden inline">
                              ${coin.price < 0.0001 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 }) : coin.price < 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </span>
                        </div>
                        
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 3.5 VOLUME */}
                      <div className="relative hidden md:flex z-10 flex-col justify-center items-center text-center px-1 py-1.5">
                        <span className="text-[10px] sm:text-[11px] font-black text-white/80 font-mono leading-none">
                          ${coin.volume24h > 1000000 ? (coin.volume24h / 1000000).toFixed(1) + 'M' : coin.volume24h > 1000 ? (coin.volume24h / 1000).toFixed(1) + 'K' : coin.volume24h.toFixed(0)}
                        </span>
                        <span className="text-[6px] text-zinc-600 uppercase font-black tracking-widest mt-1">ОБЪЕМ 24Ч</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 5. PERCENTAGES */}
                      <div className={`relative z-10 flex items-center justify-center px-1 sm:px-1.5 py-2 sm:py-1`}>
                        <div className={`px-1 sm:px-1.5 h-6 sm:h-5 flex items-center justify-center shrink-0 transition-all duration-300 ${
                          coin.change24h >= 0 ? 'text-[#00ff88]' : 'text-[#ff3355]'
                        }`}>
                          <span className="text-[10px] sm:text-[12px] font-black font-mono leading-none">
                            {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                          </span>
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 4. MARKET */}
                      <div className="relative hidden md:flex z-10 items-center justify-center px-1.5 py-1.5">
                        <div className={`flex items-center justify-center shrink-0 transition-all duration-300 qc-hud-market-type !text-[8px] sm:!text-[9px] text-white`}>
                          <span className="font-black uppercase tracking-[0.1em] font-mono leading-none">
                            {coin.market === 'FUTURES' ? 'ФЬЮЧЕРС' : 'СПОТ'}
                          </span>
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-purple-500/20" />
                      </div>

                      {/* 6. TREND */}
                      <div className="relative hidden lg:flex z-10 items-center justify-center px-2 py-4">
                         <div className="w-full max-w-[160px] h-8">
                           <Sparkline symbol={coin.symbol} exchange={coin.exchange} market={coin.market} isLong={coin.change24h >= 0} />
                         </div>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-6 bg-purple-500/20" />
                      </div>

                      {/* 7. EXCHANGE LOGO */}
                      <div className="relative hidden md:flex z-10 items-center justify-center px-2 py-3">
                        <ExchangeLogo exchange={coin.exchange} />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 sm:h-3 bg-purple-500/20" />
                      </div>

                      {/* 3.5 AI BUTTON (Unified for Mobile/Desktop) */}
                      <div className={`relative flex z-10 items-center justify-center px-0.5 py-2 ${!isPortrait ? 'w-full md:w-auto' : ''}`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenAI) onOpenAI(coin);
                          }}
                          className={`flex items-center justify-center rounded-lg border border-rose-500/40 bg-gradient-to-r from-purple-950/80 to-rose-900/80 hover:from-purple-900 hover:to-rose-800 transition-all group shadow-[0_0_10px_rgba(225,29,72,0.2)] ${
                            // Responsive sizing
                            'md:px-4 md:py-1.5 md:gap-2 md:w-auto ' + 
                            (!isPortrait ? 'px-3 py-1.5 gap-2 w-full' : 'w-7 h-7 md:w-auto md:h-auto')
                          }`}
                        >
                          <BrainCircuit className={`${!isPortrait ? 'w-3 h-3' : 'w-3 h-3 md:w-3.5 md:h-3.5'} text-rose-400 group-hover:scale-110 transition-transform`} />
                          {(!isPortrait || true) && (
                            <span className={`text-[9px] md:text-[10px] font-black text-white/90 tracking-tighter uppercase whitespace-nowrap ${isPortrait ? 'hidden lg:inline' : 'inline'}`}>
                              AI АНАЛИЗ
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      
      {/* REMOVED INTERNAL MODAL RENDERING - NOW HANDLED BY DASHBOARD */}
    </div>
  );
};

export default MarketScreener;
