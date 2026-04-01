
import React, { useState, useEffect, useMemo } from 'react';
import { RowData, OrderBookEntry, SettingsState, MarketType } from '../models';
import './QuantumCard.css';
import { BarChart3, Navigation, Type, ShieldCheck, Activity, BrainCircuit, Settings, RotateCcw } from 'lucide-react';
import { AIBookModal } from './AIBookModal';
import { ExchangeLogo } from './UI/Shared';
import { Language, translations } from '../src/translations';

const formatShortNumber = (num: number): string => {
  if (isNaN(num) || num === 0) return '0.00';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млрд';
  if (num >= 1_000_000) return (num / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';
  if (num >= 1_000) return (num / 1_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + 'к';
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
};

const CoinLogoMini = React.memo(({ symbol, size = "w-6 h-6" }: { symbol: string; size?: string }) => {
  const [error, setError] = useState(false);
  const base = symbol.replace('USDT', '').toUpperCase();
  const src = `/api/logos/${base}`;

  const getPlaceholderBg = (s: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-600', 'bg-rose-600'];
    const index = s.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className={`${size} rounded-full bg-black border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative`}>
      {!error ? (
        <img 
          src={src} 
          alt="" 
          className="w-full h-full object-contain p-1" 
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <div className={`qc-coin-placeholder-text w-full h-full flex items-center justify-center font-bold text-white ${getPlaceholderBg(base)}`}>
          {base.slice(0, 2)}
        </div>
      )}
    </div>
  );
});

const OrderBookMini: React.FC<{ depth: OrderBookEntry[]; isLong: boolean; language: Language }> = ({ depth, isLong, language }) => {
  if (!depth || depth.length === 0) return null;
  const t = translations[language];

  return (
    <div className="qc-ob-container">
      <div className="qc-ob-header flex items-center justify-between mb-1 px-1">
        <span className="qc-ob-header-text font-bold text-gray-500 tracking-[0.2em] uppercase">{t.order_book_slice}</span>
        <Activity size={8} className="text-purple-500 animate-pulse" />
      </div>
      
      <div className="qc-ob-list">
        {depth.map((level, idx) => (
          <div key={idx} className={`qc-ob-row ${level.isDensity ? 'qc-ob-density-row' : ''}`}>
            <div className="qc-ob-price">
              {level.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
            </div>
            
            <div className="qc-ob-vol-container">
              <div 
                className="qc-ob-bar" 
                style={{ 
                  width: `${level.relativeSize * 100}%`,
                  backgroundColor: level.isDensity 
                    ? (isLong ? 'var(--hud-pos)' : 'var(--hud-neg)') 
                    : (isLong ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 51, 85, 0.2)')
                }}
              />
              <span className="qc-ob-vol-text">{formatShortNumber(level.volume)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DensityCard = React.memo(({ data, isLong, onAnalyze, language }: { data: RowData; isLong: boolean; onAnalyze: (data: RowData) => void; language: Language }) => {
  if (!data || !data.pair) return null;
  const t = translations[language];

  const priceVal = parseFloat(String(data.price));
  const reactionPriceVal = data.reactionPrice ? parseFloat(String(data.reactionPrice)) : priceVal;
  const reactionPriceStr = reactionPriceVal.toLocaleString('ru-RU', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 10 
  });
  
  const pct = parseFloat(String(data.percentage || '0'));
  const pctStr = (pct > 0 ? '+' : '') + pct.toLocaleString('ru-RU', { 
    minimumFractionDigits: 3, 
    maximumFractionDigits: 4 
  }) + '%';
  
  const densityRaw = parseFloat(String(data.rawVolume || '0'));
  const density = formatShortNumber(densityRaw);
  
  const exchange = data.exchange || 'БИРЖА';
  const exName = exchange.toLowerCase().includes('bybit') ? 'Bybit' : 'Binance';

  const statusColor = isLong ? 'var(--hud-pos)' : 'var(--hud-neg)';
  const statusLabel = isLong ? t.buy : t.sell;

  const rd = data.relDensity || 0;
  let rdColor = 'var(--hud-text)';
  if (rd >= 3.5) rdColor = 'var(--hud-pos)';
  if (rd >= 7.0) rdColor = '#a855f7'; 
  if (rd >= 12.0) rdColor = '#f59e0b'; 

  const isSpot = data.marketType === 'SPOT';
  const isTuned = data.isTuned; 

  return (
    <div className="qc-hud-card h-full">
      <div className="qc-hud-scanline"></div>
      
      <div className="qc-hud-content">
        <div className="qc-hud-header">
           <div className="qc-hud-header-left">
              <div className="qc-hud-meta">
                  <span className="qc-hud-exchange">{exchange}</span>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <div className="flex items-center gap-2">
                      <ExchangeLogo exchange={exName} />
                      <div className="flex items-center gap-1.5">
                        <CoinLogoMini symbol={data.pair} size="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="qc-hud-pair leading-none text-white/70">{data.pair} / USDT</span>
                      </div>
                    </div>
                    
                    <div className="w-[1px] h-3 bg-white/20 mx-0.5" />

                    <div className="qc-hud-market-type font-black uppercase tracking-widest font-mono leading-none text-white">
                      {isSpot ? 'СПОТ' : 'ФЬЮЧЕРС'}
                    </div>
                    {isTuned && (
                      <span className="flex items-center gap-0.5 text-[7px] px-1 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                        <ShieldCheck size={8} /> 1%
                      </span>
                    )}
                  </div>
              </div>
           </div>
           
           <div className="qc-hud-status">
              <span className="qc-hud-status-text" style={{ color: statusColor }}>{statusLabel}</span>
              <div className="qc-hud-blinker" style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}></div>
           </div>
        </div>

        <div className="flex gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div className="qc-hud-price-box flex-1">
             <div className="qc-hud-label-tiny uppercase font-bold tracking-widest">{t.density_price}</div>
             <div className="qc-hud-price-val text-white/70">
               {reactionPriceStr}
             </div>
          </div>
        </div>

        <div className="qc-hud-grid">
           <div className="qc-hud-metric-box">
              <div className="qc-metric-label">{t.volume}</div>
              <div className="qc-metric-value text-accent">${density}</div>
           </div>

           <div className="qc-hud-metric-box">
              <div className="qc-metric-label">RD (X)</div>
              <div className="qc-metric-value" style={{ color: rdColor }}>{rd.toFixed(1)}</div>
           </div>

           <div className="qc-hud-metric-box">
              <div className="qc-metric-label">{t.distance}</div>
              <div className="qc-metric-value" style={{ color: statusColor }}>
                 {pctStr}
              </div>
           </div>

           <div className="qc-hud-metric-box">
              <div className="qc-metric-label">{t.rating}</div>
              <div className="qc-metric-value text-purple-400">
                 {data.rating || 0}%
              </div>
           </div>
        </div>

        <div className="qc-hud-ob-section">
           <OrderBookMini depth={data.depth || []} isLong={isLong} language={language} />
        </div>

        <div className="qc-hud-footer">
           <span className="font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onAnalyze(data);
             }}
             className="flex items-center gap-1.5 px-3 py-1 rounded border border-rose-500/30 bg-gradient-to-r from-purple-950/90 to-rose-900/90 hover:from-purple-900 hover:to-rose-800 transition-all group shadow-[0_0_10px_rgba(225,29,72,0.15)] ml-auto"
           >
             <BrainCircuit className="w-2.5 h-2.5 text-rose-400 group-hover:scale-110 transition-transform" />
             <span className="text-[9px] font-black text-white/90 tracking-tighter uppercase">AI АНАЛИЗ</span>
           </button>
        </div>
      </div>
    </div>
  );
});

type SortMode = 'volume' | 'distance' | 'alphabet' | 'rating';

const SortButton: React.FC<{ 
  mode: SortMode, 
  currentMode: SortMode, 
  icon: any, 
  label: string, 
  onSelect: (m: SortMode) => void 
}> = ({ mode, currentMode, icon: Icon, label, onSelect }) => (
  <button 
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(mode);
    }}
    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl group pointer-events-auto cursor-pointer transition-all border ${
      currentMode === mode 
      ? 'bg-black/40 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' 
      : 'bg-black/20 border-white/5 hover:border-purple-500/30'
    }`}
  >
    <Icon size={12} className={currentMode === mode ? 'text-purple-500' : 'text-gray-500 group-hover:text-gray-300'} />
    <span className={`text-[10px] font-black uppercase tracking-widest ${
      currentMode === mode ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
    }`}>
      {label}
    </span>
    {currentMode === mode && (
      <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] rounded-full" />
    )}
  </button>
);

const Table: React.FC<{ 
  shortData: RowData[]; 
  longData: RowData[]; 
  language?: Language;
  onOpenAI?: (coin: any) => void;
  spotSettings: SettingsState;
  futuresSettings: SettingsState;
  onSettingChange: (type: MarketType, key: keyof SettingsState, val: string) => void;
  onResetSettings: (type: MarketType) => void;
}> = ({ 
  shortData, 
  longData, 
  language = 'ru', 
  onOpenAI,
  spotSettings,
  futuresSettings,
  onSettingChange,
  onResetSettings
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('volume');
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null);
  const t = translations[language];

  const settingLabels: Record<keyof SettingsState, string> = {
    volumeFilter: 'Мин. объем уровня (USDT)',
    minDensityVolume: 'Мин. стена (USDT)',
    distancePercentage: 'Макс. расст. (%)',
    peerMultiplier: 'Коэфф. доминации (x)',
    peerCount: 'Кол-во заявок для анализа',
    densityObserveTimeMs: 'Время наблюдения (мс)',
    degradationThreshold: 'Порог деградации (0-1)',
    rdMissLimit: 'Лимит (не исп.)'
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedData = useMemo(() => {
    const combined = [...longData, ...shortData];
    
    return combined.sort((a, b) => {
      switch (sortMode) {
        case 'distance': {
          const valA = Math.abs(parseFloat(String(a.percentage || 0)));
          const valB = Math.abs(parseFloat(String(b.percentage || 0)));
          return valA - valB;
        }
        case 'alphabet': {
          const nameA = String(a.pair || '').toUpperCase();
          const nameB = String(b.pair || '').toUpperCase();
          return nameA.localeCompare(nameB);
        }
        case 'rating': {
          const valA = Number(a.rating) || 0;
          const valB = Number(b.rating) || 0;
          return valB - valA;
        }
        case 'volume':
        default: {
          const valA = Number(a.rawVolume) || 0;
          const valB = Number(b.rawVolume) || 0;
          return valB - valA;
        }
      }
    });
  }, [shortData, longData, sortMode]);

  return (
    <div className="w-full flex flex-col bg-[#050505] relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#050505] backdrop-blur-xl shrink-0 z-[40] pointer-events-auto">
        <div className="flex items-center gap-2">
          <SortButton mode="volume" currentMode={sortMode} icon={BarChart3} label={t.volume} onSelect={setSortMode} />
          <SortButton mode="distance" currentMode={sortMode} icon={Navigation} label={t.distance} onSelect={setSortMode} />
          <SortButton mode="rating" currentMode={sortMode} icon={ShieldCheck} label={t.rating} onSelect={setSortMode} />
          <SortButton mode="alphabet" currentMode={sortMode} icon={Type} label={t.asset} onSelect={setSortMode} />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
            {t.monitoring} <span className="text-purple-400">{sortedData.length}</span>
          </div>

          <div className="relative" ref={settingsDropdownRef}>
            <button 
              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)} 
              className={`p-2 bg-purple-500/5 border border-purple-500/10 rounded-full hover:bg-purple-500/15 transition-all group ${isSettingsDropdownOpen ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''}`}
            >
              <Settings size={18} className={isSettingsDropdownOpen ? 'text-purple-400' : 'text-purple-400/80 group-hover:text-purple-300 transition-colors'} />
            </button>
            {isSettingsDropdownOpen && (
              <div className="absolute top-full right-0 mt-3 w-[calc(100vw-4rem)] sm:w-[720px] bg-black/95 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,1)] z-[100] p-3 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-8 backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-300 overflow-hidden">
                {(['SPOT', 'FUTURES'] as MarketType[]).map(type => (
                  <div key={type} className="flex-1">
                    <div className="flex items-center justify-between mb-3 sm:mb-4 bg-purple-500/5 p-2 rounded border border-purple-500/10">
                      <div className="qc-hud-market-type font-black uppercase tracking-[0.3em] !text-[10px] text-white">
                        {type === 'SPOT' ? 'СПОТ' : 'ФЬЮЧЕРС'}
                      </div>
                      <button onClick={() => onResetSettings(type)} className="text-gray-600 hover:text-white transition-colors"><RotateCcw size={12} /></button>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[300px] sm:max-h-[420px] pr-2 custom-scroll">
                      {Object.keys(type === 'SPOT' ? spotSettings : futuresSettings).filter(k => k !== 'rdMissLimit').map(key => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 group">
                          <label className="text-[10px] text-gray-500 uppercase font-bold group-hover:text-gray-300 transition-colors">{(settingLabels as any)[key]}</label>
                          <input 
                            className="w-20 bg-black/50 border border-white/10 text-[11px] p-1 text-right focus:border-purple-500 focus:bg-purple-500/5 outline-none font-mono text-purple-200" 
                            value={type === 'SPOT' ? (spotSettings as any)[key] : (futuresSettings as any)[key]} 
                            onChange={(e) => onSettingChange(type, key as any, e.target.value)} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 z-[10] min-h-0">
        <div 
          className="grid gap-6 lg:gap-8 pb-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mobile-landscape-2-col"
        >
          {sortedData.map((row) => (
            <DensityCard 
              key={row.id} 
              data={row} 
              isLong={row.side === 'bid'} 
              onAnalyze={(data) => onOpenAI && onOpenAI(data)}
              language={language}
            />
          ))}
          {sortedData.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-600 font-mono text-[10px] uppercase tracking-[0.3em] gap-4">
               <div className="w-12 h-12 border border-white/5 border-t-purple-500 rounded-full animate-spin"></div>
               {t.searching_anomalies}
            </div>
          )}
        </div>
      </div>

      {/* REMOVED INTERNAL MODAL RENDERING - NOW HANDLED BY DASHBOARD */}
    </div>
  );
};

export default Table;
