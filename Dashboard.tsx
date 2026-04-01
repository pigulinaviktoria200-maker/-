
import React, { useEffect, useRef, useState } from 'react';
import Table from './Table';
import MarketScreener, { MarketCoin, FavoriteStar, CustomUndoIcon, CustomRedoIcon } from './MarketScreener';
import AIAnalystPanel from './AIAnalystPanel';
import { AIBookModal } from './AIBookModal';
import { ExchangeLogo } from './UI/Shared';
import { BINANCE_ICON, BYBIT_ICON } from '../src/constants';

const MemoTable = React.memo(Table);
const MemoMarketScreener = React.memo(MarketScreener);
import { RowData, SettingsState, ExchangeSelection, MarketType, ExchangeConfig, STORAGE_PREFIX, DEFAULT_SETTINGS, getConfigsForMarket } from '../models';
import { WintradingEngineService, CONFIG } from '../services/wintrading-engine.service';
import { User, Settings, ChevronDown, LayoutGrid, Check, Globe, RotateCcw, Star, Loader2, ChevronUp, BrainCircuit } from 'lucide-react';
import { Logo } from './UI/Icons';
import { Language, translations } from '../src/translations';
import { MarketSidebar } from './MarketSidebar';

const Dashboard: React.FC<{ 
  onNavigateToProfile: () => void;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  engine: WintradingEngineService;
}> = ({ onNavigateToProfile, language, setLanguage, engine }) => {
  const [activeTab, setActiveTab] = useState<'screener' | 'market'>('market');
  const t = translations[language];
  const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true);
  const [shortData, setShortData] = useState<RowData[]>([]);
  const [longData, setLongData] = useState<RowData[]>([]);
  const [rankMap, setRankMap] = useState<Record<string, number>>({});
  
  // Shared state for MarketScreener, Header, and Sidebar
  const [previewCoin, setPreviewCoin] = useState<MarketCoin | null>(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('smarteye_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showExtraTf, setShowExtraTf] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [isMultiChart, setIsMultiChart] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; symbol: string; price: number; type: 'above' | 'below' }[]>([]);
  
  const miniChartRef = useRef<any>(null);
  const tfDropdownRef = useRef<HTMLDivElement>(null);

  const MAIN_TIMEFRAMES = ['1m', '15m', '1h'];
  const EXTRA_TIMEFRAMES = ['3m', '5m', '30m', '2h', '4h', '6h', '12h', '1d', '2d', '5d', '1w'];

  useEffect(() => {
    localStorage.setItem('smarteye_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (previewCoin) {
      setPriceFlash(true);
      const timer = setTimeout(() => setPriceFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [previewCoin?.price]);

  const toggleFavorite = (e: React.MouseEvent, coin: MarketCoin) => {
    e.stopPropagation();
    const key = `${coin.exchange}:${coin.market}:${coin.symbol}`;
    setFavorites(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isFavorite = (coin: MarketCoin) => {
    return favorites.includes(`${coin.exchange}:${coin.market}:${coin.symbol}`);
  };

  const [selectedExchanges, setSelectedExchanges] = useState<ExchangeSelection>({ 
    'Binance Spot': true, 'Binance Futures': true, 'Bybit Spot': true, 'Bybit Futures': true
  });
  
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiBookCoin, setAiBookCoin] = useState<any>(null);
  const [isAiBookOpen, setIsAiBookOpen] = useState(false);
  const exchangeDropdownRef = useRef<HTMLDivElement>(null);

  const [spotSettings, setSpotSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'spot');
    return saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
  });
  const [futuresSettings, setFuturesSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'futures');
    return saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
  });

  const spotSettingsRef = useRef(spotSettings);
  const futuresSettingsRef = useRef(futuresSettings);

  useEffect(() => {
    spotSettingsRef.current = spotSettings;
    localStorage.setItem(STORAGE_PREFIX + 'spot', JSON.stringify(spotSettings));
  }, [spotSettings]);

  useEffect(() => {
    futuresSettingsRef.current = futuresSettings;
    localStorage.setItem(STORAGE_PREFIX + 'futures', JSON.stringify(futuresSettings));
  }, [futuresSettings]);

  useEffect(() => {
    const fetchRanks = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
        if (response.ok) {
          const data = await response.json();
          const mapping: Record<string, number> = {};
          data.forEach((coin: any) => {
            mapping[coin.symbol.toUpperCase()] = coin.market_cap_rank;
          });
          setRankMap(mapping);
          engine.setRankMap(mapping);
        }
      } catch (error) {
        console.error('Error fetching ranks:', error);
      }
    };
    fetchRanks();
  }, [engine]);

  useEffect(() => {
    const subL = engine.longs$.subscribe(setLongData);
    const subS = engine.shorts$.subscribe(setShortData);
    engine.startPipeline(CONFIG.engineTickMs, (t) => t === 'SPOT' ? spotSettingsRef.current : futuresSettingsRef.current);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (exchangeDropdownRef.current && !exchangeDropdownRef.current.contains(event.target as Node)) {
        setIsExchangeDropdownOpen(false);
      }
      if (tfDropdownRef.current && !tfDropdownRef.current.contains(event.target as Node)) {
        setShowExtraTf(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);

    return () => { 
      subL.unsubscribe(); subS.unsubscribe(); engine.stopPipeline(); engine.disconnectAll();
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [engine]);

  useEffect(() => {
    const configs: ExchangeConfig[] = [];
    if (selectedExchanges['Binance Spot']) configs.push(...getConfigsForMarket('SPOT', 'Binance'));
    if (selectedExchanges['Binance Futures']) configs.push(...getConfigsForMarket('FUTURES', 'Binance'));
    if (selectedExchanges['Bybit Spot']) configs.push(...getConfigsForMarket('SPOT', 'Bybit'));
    if (selectedExchanges['Bybit Futures']) configs.push(...getConfigsForMarket('FUTURES', 'Bybit'));
    engine.connectExchanges(configs);
  }, [selectedExchanges, engine]);

  const toggleExchange = (key: string) => setSelectedExchanges(prev => ({...prev, [key]: !prev[key]}));

  const handleInputChange = (type: MarketType, key: keyof SettingsState, val: string) => {
    if (type === 'SPOT') setSpotSettings(p => ({...p, [key]: val}));
    else setFuturesSettings(p => ({...p, [key]: val}));
  };

  const resetToDefault = (type: MarketType) => {
    if (type === 'SPOT') setSpotSettings({ ...DEFAULT_SETTINGS });
    else setFuturesSettings({ ...DEFAULT_SETTINGS });
  };

  const exchangeList = [
    { key: 'Binance Spot', name: 'Binance', sub: 'СПОТ', logo: BINANCE_ICON },
    { key: 'Binance Futures', name: 'Binance', sub: 'ФЬЮЧЕРС', logo: BINANCE_ICON },
    { key: 'Bybit Spot', name: 'Bybit', sub: 'СПОТ', logo: BYBIT_ICON },
    { key: 'Bybit Futures', name: 'Bybit', sub: 'ФЬЮЧЕРС', logo: BYBIT_ICON },
  ];

  return (
    <div className="h-full w-full bg-black text-white p-0 flex flex-col overflow-hidden relative">
      <div className="sticky top-0 z-50 flex flex-col shrink-0 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {/* TOP ROW: LOGO + MAIN NAV + TOOLS */}
        <div className="flex justify-between items-center h-11 md:h-14 bg-black pl-2 pr-2 md:px-4 border-b border-white/5">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-2.5 group cursor-default">
              <div className="hidden md:block">
                <Logo size="md" />
              </div>
              <div className="md:hidden">
                <Logo size="sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-rajdhani font-bold tracking-[0.2em] text-lg md:text-xl leading-none bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent uppercase">SMARTEYE</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/5 ml-4">
                <button 
                  onClick={() => setActiveTab('market')} 
                  className={`flex items-center gap-2 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeTab === 'market' 
                    ? 'bg-black border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                    : 'text-gray-500 hover:text-gray-300 border-transparent hover:bg-white/5'
                  }`}
                >
                  <Globe size={14} /> {t.market}
                </button>
                <button 
                  onClick={() => setActiveTab('screener')} 
                  className={`flex items-center gap-2 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeTab === 'screener' 
                    ? 'bg-black border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                    : 'text-gray-500 hover:text-gray-300 border-transparent hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid size={14} /> {t.densities}
                </button>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 sm:gap-4">
            <button 
              onClick={() => setLanguage(prev => prev === 'ru' ? 'en' : 'ru')}
              className="flex items-center gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <Globe size={14} className="text-purple-400" />
              <span className="hidden xs:inline">{language === 'ru' ? 'RU' : 'EN'}</span>
            </button>

            <button 
              onClick={() => setIsAiPanelOpen(true)} 
              className={`hidden md:flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all group ${isAiPanelOpen ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : ''}`}
            >
              <BrainCircuit size={14} className={isAiPanelOpen ? 'text-rose-400' : 'text-rose-500/70 group-hover:text-rose-400'} />
              <span>{t.ai_analysis_label}</span>
            </button>

            <button onClick={onNavigateToProfile} className="p-2 bg-purple-500/5 border border-purple-500/10 rounded-full hover:bg-purple-500/15 transition-all group">
              <User size={18} className="text-purple-400/80 group-hover:text-purple-300 transition-colors" />
            </button>

            <div className="relative" ref={exchangeDropdownRef}>
              <button 
                onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)} 
                className={`text-[9px] sm:text-[11px] uppercase tracking-[0.1em] font-black px-1.5 md:px-4 py-1 md:py-2 rounded-xl border transition-all flex items-center gap-1.5 sm:gap-3 group ${
                  isExchangeDropdownOpen 
                  ? 'bg-black border-zinc-500/60 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' 
                  : 'bg-black/40 border-white/40 text-gray-400 hover:border-zinc-500/30 hover:bg-black hover:text-gray-300'
                }`}
              >
                <span className="hidden sm:inline">{t.exchanges}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 font-mono text-xs sm:text-sm">[</span>
                  <div className="flex gap-1">
                    {(() => {
                      const hasBinance = selectedExchanges['Binance Spot'] || selectedExchanges['Binance Futures'];
                      const hasBybit = selectedExchanges['Bybit Spot'] || selectedExchanges['Bybit Futures'];
                      const icons = [];
                      if (hasBinance) icons.push({ id: 'binance', src: BINANCE_ICON, isBybit: false });
                      if (hasBybit) icons.push({ id: 'bybit', src: BYBIT_ICON, isBybit: true });
                      
                      return icons.map(icon => (
                        <div key={icon.id} className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border border-white/10 bg-[#111] flex items-center justify-center overflow-hidden shadow-sm">
                          <img 
                            src={icon.src} 
                            className={`w-full h-full object-contain ${icon.isBybit ? 'scale-[1.6] px-0.5' : 'p-0.5'}`} 
                            alt="" 
                          />
                        </div>
                      ));
                    })()}
                  </div>
                  <span className="text-gray-400 font-mono text-xs sm:text-sm">]</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${isExchangeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExchangeDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 bg-[#0a0a0a]/95 border border-zinc-500/30 p-2.5 sm:p-3 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-[100] w-64 sm:w-72 max-w-[calc(100vw-1rem)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="space-y-1.5 sm:space-y-2">
                    {exchangeList.map(ex => (
                      <div 
                        key={ex.key} 
                        onClick={() => toggleExchange(ex.key)}
                        className={`flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border cursor-pointer transition-all group ${
                          selectedExchanges[ex.key] 
                          ? 'bg-black border-zinc-500/60 shadow-[0_0_10px_rgba(255,255,255,0.05)]' 
                          : 'bg-black/40 border-white/5 hover:border-zinc-500/30 hover:bg-black'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <ExchangeLogo exchange={ex.name as 'Binance' | 'Bybit'} size="w-10 h-6" />
                            <div className="flex flex-col leading-tight">
                              <span className={`text-[13px] font-bold tracking-tight ${selectedExchanges[ex.key] ? 'text-white' : 'text-gray-400'}`}>{ex.name}</span>
                              <span className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none ${selectedExchanges[ex.key] ? 'text-white' : 'text-white/40'}`}>{ex.sub}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          selectedExchanges[ex.key] 
                          ? 'bg-zinc-800 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                          : 'bg-white/5 border border-white/10'
                        }`}>
                          {selectedExchanges[ex.key] && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: TERMINAL CONTROLS (UNIFIED) */}
        {activeTab !== 'screener' && (
          <div className="min-h-[36px] md:min-h-[44px] h-[36px] md:h-[44px] bg-[#050505] flex flex-nowrap items-center px-2 md:px-4 gap-0 overflow-x-auto no-scrollbar relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent pointer-events-none" />
            
            {previewCoin && (
              <div className="flex items-center gap-1.5 md:gap-3 pr-2 md:pr-4 h-6 md:h-8 relative shrink-0">
                <div className="flex items-center gap-1.5 md:gap-2.5">
                   <FavoriteStar 
                     coin={previewCoin} 
                     isInitialFavorite={isFavorite(previewCoin)} 
                     onToggle={toggleFavorite} 
                     size={12}
                   />
                   <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/10 flex items-center justify-center p-1 bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                     <img 
                       src={`/api/logos/${previewCoin.baseAsset.toUpperCase()}`} 
                       className="w-full h-full object-contain" 
                       alt="" 
                     />
                   </div>
                   <div className="flex flex-col">
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-sm md:text-lg font-black tracking-tight text-white uppercase leading-none">
                          <span className="md:hidden">{previewCoin.symbol.replace('USDT', '')}</span>
                          <span className="hidden md:inline">{previewCoin.symbol.includes('USDT') ? previewCoin.symbol.replace('USDT', ' / USDT') : `${previewCoin.symbol} / USDT`}</span>
                        </span>
                        <ExchangeLogo exchange={previewCoin.exchange} size="w-10 h-4 md:w-14 md:h-6" />
                      </div>
                   </div>
                </div>
              </div>
            )}

            {previewCoin && (
              <div className="flex items-center px-3 md:px-6 h-6 md:h-8 border-r border-white/10 shrink-0 gap-2 md:gap-3">
                <span className="text-sm md:text-xl font-mono font-black leading-none text-white/90">
                  ${previewCoin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </span>
                <span className={`${!isPortrait ? 'block' : 'hidden md:block'} text-[10px] md:text-[13px] font-black font-mono leading-none ${previewCoin.change24h >= 0 ? 'text-[#00ff88]' : 'text-[#ff3355]'}`}>
                  {previewCoin.change24h >= 0 ? '+' : ''}{previewCoin.change24h.toFixed(2)}%
                </span>
              </div>
            )}

            {previewCoin && (
              <button 
                onClick={() => {
                  setAiBookCoin(previewCoin);
                  setIsAiBookOpen(true);
                }}
                className={`items-center gap-1.5 px-2 md:px-3 py-1 bg-gradient-to-r from-purple-950/90 to-rose-900/90 border border-rose-500/30 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:from-purple-900 hover:to-rose-800 transition-all shrink-0 ml-1 md:ml-2 group shadow-[0_0_10px_rgba(225,29,72,0.15)] ${!isPortrait ? 'flex' : 'hidden md:flex'}`}
              >
                <BrainCircuit size={14} className="text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline text-white/90">AI АНАЛИЗ</span>
                <span className="sm:hidden text-white/90">AI</span>
              </button>
            )}

            {previewCoin && (
              <div className="flex-1 flex justify-end items-center pl-2 md:pl-4 gap-1.5 md:gap-3 shrink-0">
                {/* UNDO/REDO ARROWS */}
                <div className="flex items-center gap-0 relative">
                  <button 
                    onClick={() => miniChartRef.current?.undo()}
                    className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg transition-all ${historyState.canUndo ? 'text-white' : 'text-gray-600 cursor-not-allowed'}`}
                    title="Undo"
                    disabled={!historyState.canUndo}
                  >
                    <CustomUndoIcon />
                  </button>
                  <button 
                    onClick={() => miniChartRef.current?.redo()}
                    className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg transition-all ${historyState.canRedo ? 'text-white' : 'text-gray-600 cursor-not-allowed'}`}
                    title="Redo"
                    disabled={!historyState.canRedo}
                  >
                    <CustomRedoIcon />
                  </button>
                </div>

                <div className="w-[1px] h-4 bg-white/10 mx-2 hidden md:block" />

                {/* TIMEFRAME SELECTOR */}
                <div className="flex items-center gap-0.5 md:gap-1 bg-white/[0.03] p-0.5 rounded-xl backdrop-blur-md">
                  {MAIN_TIMEFRAMES.map((tf, idx) => (
                    <React.Fragment key={tf}>
                      <button 
                        onClick={() => setTimeframe(tf)} 
                        className={`px-1.5 md:px-2.5 py-1 md:py-1 rounded-lg text-[9px] md:text-[10px] font-black font-mono uppercase transition-all whitespace-nowrap ${
                          timeframe === tf 
                          ? 'text-purple-400/90 bg-purple-500/10 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {tf}
                      </button>
                      {idx < MAIN_TIMEFRAMES.length - 1 && (
                        <div className="w-[1px] h-2 md:h-2.5 bg-white/10 mx-0.5 self-center opacity-40" />
                      )}
                    </React.Fragment>
                  ))}
                  <div className="w-[1px] h-3 md:h-3.5 bg-white/10 mx-1 md:mx-1"></div>
                  <div className="relative" ref={tfDropdownRef}>
                    <button 
                      onClick={() => setShowExtraTf(!showExtraTf)}
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-lg text-gray-500 flex items-center justify-center transition-all ${
                        EXTRA_TIMEFRAMES.includes(timeframe) 
                        ? 'text-purple-400 bg-purple-500/15 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                        : 'hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <ChevronDown size={12} className={`transition-transform duration-300 ${showExtraTf ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showExtraTf && (
                      <div className="absolute top-full right-0 mt-3 bg-[#0a0a0a]/95 border border-purple-500/40 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-[200] min-w-[220px] backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-300 overflow-hidden ring-1 ring-white/5">
                        <div className="max-h-[70vh] overflow-y-auto custom-scroll py-2">
                          {[
                            { label: language === 'ru' ? 'Минуты' : 'Minutes', items: ['1m', '3m', '5m', '15m', '30m'] },
                            { label: language === 'ru' ? 'Часы' : 'Hours', items: ['1h', '2h', '4h', '6h', '12h'] },
                            { label: language === 'ru' ? 'Дни / Недели' : 'Days / Weeks', items: ['1d', '2d', '5d', '1w'] }
                          ].map((section, sIdx) => (
                            <div key={section.label} className={sIdx > 0 ? 'border-t border-white/5 mt-2 pt-2' : ''}>
                              <div className="px-4 py-1.5 flex items-center justify-between group cursor-default">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{section.label}</span>
                                <ChevronUp size={10} className="text-gray-600" />
                              </div>
                              
                              <div className="flex flex-col">
                                {section.items.map(tf => {
                                  const isActive = timeframe === tf;
                                  return (
                                    <button 
                                      key={tf} 
                                      onClick={() => {
                                        setTimeframe(tf);
                                        setShowExtraTf(false);
                                      }} 
                                      className={`w-full px-4 py-3 flex items-center justify-between transition-all group relative ${
                                        isActive 
                                        ? 'bg-purple-500/10 text-purple-400' 
                                        : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                                      }`}
                                    >
                                      {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                      )}
                                      <span className={`text-[13px] font-bold font-mono uppercase ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                                        {tf}
                                      </span>
                                      {isActive && <Check size={14} className="text-purple-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-h-0 overflow-hidden bg-[#050505] relative pb-16 md:pb-0 flex flex-row">
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'market' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* MARKET SCREENER - HANDLES CHART, CONTROLS AND ITS OWN SCROLLABLE LIST */}
              <MemoMarketScreener 
                language={language} 
                previewCoin={previewCoin}
                setPreviewCoin={setPreviewCoin}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                miniChartRef={miniChartRef}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                rankMap={rankMap}
                onHistoryChange={setHistoryState}
                onOpenAI={(coin) => {
                  setAiBookCoin(coin);
                  setIsAiBookOpen(true);
                }}
                isAiModalOpen={isAiBookOpen || isAiPanelOpen}
                isMultiChart={isMultiChart}
                setIsMultiChart={setIsMultiChart}
                alerts={alerts}
                setAlerts={setAlerts}
                engine={engine}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* CHART BLOCK - FIXED AT TOP EVEN IN SCREENER MODE IF NEEDED, BUT HERE WE FOLLOW TAB LOGIC */}
              <div className="w-full shrink-0 relative z-[20] bg-[#050505] border-b border-white/5">
                <MemoMarketScreener 
                  language={language} 
                  previewCoin={previewCoin}
                  setPreviewCoin={setPreviewCoin}
                  timeframe={timeframe}
                  setTimeframe={setTimeframe}
                  miniChartRef={miniChartRef}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  rankMap={rankMap}
                  onHistoryChange={setHistoryState}
                  onOpenAI={(coin) => {
                    setAiBookCoin(coin);
                    setIsAiBookOpen(true);
                  }}
                  isAiModalOpen={isAiBookOpen || isAiPanelOpen}
                  isMultiChart={isMultiChart}
                  setIsMultiChart={setIsMultiChart}
                  alerts={alerts}
                  setAlerts={setAlerts}
                  hideList={true}
                  engine={engine}
                />
              </div>

              {/* COINS BLOCK - SCROLLABLE BELOW CHART */}
              <div className="flex-1 overflow-y-auto bg-[#050505] relative custom-scroll scroll-smooth flex flex-col">
                <MemoTable 
                  shortData={shortData} 
                  longData={longData} 
                  language={language} 
                  onOpenAI={(coin) => {
                    setAiBookCoin(coin);
                    setIsAiBookOpen(true);
                  }}
                  spotSettings={spotSettings}
                  futuresSettings={futuresSettings}
                  onSettingChange={handleInputChange}
                  onResetSettings={resetToDefault}
                />
              </div>
            </div>
          )}
        </div>

        <MarketSidebar 
          language={language} 
          isMultiChart={isMultiChart}
          setIsMultiChart={setIsMultiChart}
          alerts={alerts}
          onAddAlert={(alert) => setAlerts(prev => [...prev, { ...alert, id: Math.random().toString(36).substr(2, 9) }])}
          onRemoveAlert={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
          activeCoin={previewCoin}
        />
      </div>

      <AIAnalystPanel 
        isOpen={isAiPanelOpen} 
        onClose={() => setIsAiPanelOpen(false)} 
        activeDensities={[...longData, ...shortData]} 
        language={language} 
      />

      {isAiBookOpen && aiBookCoin && (
        <AIBookModal 
          coin={aiBookCoin} 
          language={language}
          onClose={() => {
            setIsAiBookOpen(false);
            setAiBookCoin(null);
          }} 
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-12 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 z-[100] pb-safe portrait:hidden">
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 transition-all ${
            activeTab === 'market' ? 'text-purple-400' : 'text-gray-500'
          }`}
        >
          <Globe size={18} className={activeTab === 'market' ? 'scale-110' : ''} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{t.market}</span>
        </button>

        <button 
          onClick={() => setActiveTab('screener')}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 transition-all ${
            activeTab === 'screener' ? 'text-purple-400' : 'text-gray-500'
          }`}
        >
          <LayoutGrid size={18} className={activeTab === 'screener' ? 'scale-110' : ''} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{t.densities}</span>
        </button>

        <button 
          onClick={() => setIsAiPanelOpen(true)}
          className={`flex items-center justify-center transition-all ${
            isAiPanelOpen ? 'text-rose-400' : 'text-gray-500'
          } ${!isPortrait 
            ? 'flex-row gap-2 px-6 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.15)] min-w-[140px]' 
            : 'flex-col gap-0.5 w-16'}`}
        >
          <div className={`${isPortrait ? 'p-1.5 rounded-full bg-white/5' : ''} ${isAiPanelOpen ? 'bg-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.3)]' : ''}`}>
            <BrainCircuit size={isPortrait ? 18 : 22} className={isAiPanelOpen ? 'scale-110' : ''} />
          </div>
          <span className={`${isPortrait ? 'text-[8px]' : 'text-[11px]'} font-black uppercase tracking-widest`}>
            {!isPortrait ? t.ai_analysis_label : 'AI'}
          </span>
        </button>

        <button 
          className="flex flex-col items-center justify-center gap-0.5 w-16 text-gray-500 opacity-50"
          disabled
        >
          <Settings size={18} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{t.settings}</span>
        </button>

        <button 
          className="flex flex-col items-center justify-center gap-0.5 w-16 text-gray-500 opacity-50"
          disabled
        >
          <User size={18} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{t.profile}</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
