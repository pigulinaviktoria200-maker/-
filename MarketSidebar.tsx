
import React, { useState, useEffect } from 'react';
import { Bell, Newspaper, Plus, Gauge, ChevronRight, ChevronLeft, Info, ExternalLink, RefreshCw, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Language, translations } from '../src/translations';
import { MarketCoin } from './MarketScreener';

interface MarketSidebarProps {
  language: Language;
  isMultiChart: boolean;
  setIsMultiChart: (val: boolean) => void;
  alerts: { id: string; symbol: string; price: number; type: 'above' | 'below' }[];
  onAddAlert: (alert: { symbol: string; price: number; type: 'above' | 'below' }) => void;
  onRemoveAlert: (id: string) => void;
  activeCoin: MarketCoin | null;
}

export const MarketSidebar: React.FC<MarketSidebarProps> = ({ 
  language, 
  isMultiChart, 
  setIsMultiChart, 
  alerts, 
  onAddAlert, 
  onRemoveAlert,
  activeCoin
}) => {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'alerts' | 'charts' | 'fng'>('news');
  const [fngData, setFngData] = useState<{ value: string; classification: string } | null>(null);
  const [news, setNews] = useState<{ title: string; url: string; time: string }[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  
  // Alert form state
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');

  useEffect(() => {
    const fetchFnG = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/');
        const json = await res.json();
        if (json.data && json.data[0]) {
          setFngData({
            value: json.data[0].value,
            classification: json.data[0].value_classification
          });
        }
      } catch (e) {
        console.error('Failed to fetch FnG', e);
      }
    };
    fetchFnG();
  }, []);

  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      const mockNews = language === 'ru' ? [
        { title: "Биткоин-ETF зафиксировали рекордный приток средств на фоне новых максимумов BTC", url: "https://www.coindesk.com", time: "2ч назад" },
        { title: "Обновление Ethereum Dencun успешно внедрено в основной сети", url: "https://cointelegraph.com", time: "5ч назад" },
        { title: "Рост экосистемы Solana продолжается с новыми рекордами DEX", url: "https://decrypt.co", time: "8ч назад" },
        { title: "SEC откладывает решение по заявкам на спотовые Ethereum-ETF", url: "https://www.theblock.co", time: "12ч назад" },
        { title: "Капитализация крипторынка превысила $3 трлн на фоне ралли альткоинов", url: "https://www.bloomberg.com/crypto", time: "1д назад" }
      ] : [
        { title: "Bitcoin ETFs see record inflows as BTC hits new highs", url: "https://www.coindesk.com", time: "2h ago" },
        { title: "Ethereum Dencun upgrade successfully implemented on mainnet", url: "https://cointelegraph.com", time: "5h ago" },
        { title: "Solana ecosystem growth continues with new DEX records", url: "https://decrypt.co", time: "8h ago" },
        { title: "SEC delays decision on spot Ethereum ETF applications", url: "https://www.theblock.co", time: "12h ago" },
        { title: "Crypto market cap surpasses $3 trillion as altcoins rally", url: "https://www.bloomberg.com/crypto", time: "1d ago" }
      ];
      setNews(mockNews);
    } catch (e) {
      console.error('Failed to fetch news', e);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'news') {
      fetchNews();
    }
  }, [isOpen, activeTab, language]);

  const getFngColor = (value: number) => {
    if (value <= 25) return 'text-red-500';
    if (value <= 45) return 'text-orange-500';
    if (value <= 55) return 'text-yellow-500';
    if (value <= 75) return 'text-green-400';
    return 'text-emerald-500';
  };

  const handleAddAlert = () => {
    if (!activeCoin || !alertPrice) return;
    const targetPrice = parseFloat(alertPrice);
    const type = targetPrice > activeCoin.price ? 'above' : 'below';
    onAddAlert({
      symbol: activeCoin.symbol,
      price: targetPrice,
      type: type
    });
    setIsAddingAlert(false);
    setAlertPrice('');
  };

  return (
    <div className={`flex h-full transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-12'} border-l border-white/10 bg-[#080808] z-[150] relative portrait:hidden`}>
      {/* Icon Bar */}
      <div className="w-12 flex flex-col items-center py-4 gap-6 shrink-0 border-r border-white/5">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-500 hover:text-white transition-colors"
        >
          {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => { setIsOpen(true); setActiveTab('news'); }}
            className={`p-2 rounded-lg transition-all ${activeTab === 'news' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Crypto News"
          >
            <Newspaper size={20} />
          </button>

          <button 
            onClick={() => { setIsOpen(true); setActiveTab('alerts'); }}
            className={`p-2 rounded-lg transition-all relative ${activeTab === 'alerts' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Set Alerts"
          >
            <Bell size={20} className={alerts.length > 0 ? 'text-white' : ''} />
            {alerts.length > 0 && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full border border-[#080808] animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            )}
          </button>

          <button 
            onClick={() => { setIsOpen(true); setActiveTab('charts'); }}
            className={`p-2 rounded-lg transition-all relative ${activeTab === 'charts' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Additional Charts"
          >
            <Plus size={20} className={`${isMultiChart ? 'rotate-45 text-white' : ''} transition-transform duration-300`} />
            {isMultiChart && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full border border-[#080808] animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            )}
          </button>

          <button 
            onClick={() => { setIsOpen(true); setActiveTab('fng'); }}
            className={`p-2 rounded-lg transition-all ${activeTab === 'fng' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Fear & Greed Index"
          >
            <Gauge size={20} />
          </button>
        </div>
      </div>

      {/* Content Panel */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              {activeTab === 'news' && t.global_news}
              {activeTab === 'alerts' && t.alerts}
              {activeTab === 'charts' && t.add_chart}
              {activeTab === 'fng' && t.market_sentiment_label}
            </h3>
            {activeTab === 'news' && (
              <button onClick={fetchNews} className={`text-gray-500 hover:text-white ${loadingNews ? 'animate-spin' : ''}`}>
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-4">
            {activeTab === 'news' && (
              <div className="flex flex-col gap-4">
                {loadingNews ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 animate-pulse">
                      <div className="h-4 bg-white/5 rounded w-full" />
                      <div className="h-3 bg-white/5 rounded w-2/3" />
                    </div>
                  ))
                ) : (
                  news.map((item, i) => (
                    <a 
                      key={i} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                      <span className="text-xs font-medium text-gray-200 group-hover:text-purple-400 transition-colors leading-relaxed">
                        {item.title}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{item.time}</span>
                        <ExternalLink size={10} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="flex flex-col gap-4">
                {isAddingAlert ? (
                  <div className="p-4 bg-black rounded-xl border border-white/10 flex flex-col gap-4 animate-in fade-in zoom-in duration-200 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">
                        {t.new_alert_title}
                      </span>
                      <button onClick={() => setIsAddingAlert(false)} className="text-gray-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">{t.target_price} (USDT)</label>
                      <input 
                        type="number"
                        value={alertPrice}
                        onChange={(e) => setAlertPrice(e.target.value)}
                        placeholder={activeCoin?.price.toString()}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gray-500 transition-all"
                      />
                    </div>

                    <button 
                      onClick={handleAddAlert}
                      disabled={!alertPrice}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                    >
                      {t.set_alert_btn}
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setIsAddingAlert(true);
                        if (activeCoin) setAlertPrice(activeCoin.price.toString());
                      }}
                      className="w-full py-3 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-white/30 transition-all group bg-white/5"
                    >
                      <Plus size={16} className="group-hover:text-purple-400 transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.create_alert}</span>
                    </button>

                    <div className="flex flex-col gap-2">
                      {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-600">
                            <Bell size={24} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-300">{t.no_active_alerts}</span>
                            <span className="text-[10px] text-gray-500">{t.set_alerts_desc}</span>
                          </div>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div key={alert.id} className="p-3 bg-black rounded-xl border border-white/10 flex items-center justify-between group hover:border-white/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${alert.type === 'above' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {alert.type === 'above' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white">{alert.symbol}</span>
                                <span className="text-[10px] text-gray-500">
                                  {alert.type === 'above' ? t.price_above : t.price_below} ${alert.price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => onRemoveAlert(alert.id)}
                              className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="flex flex-col gap-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-200">{t.multi_chart_mode}</span>
                      <span className="text-[10px] text-gray-500">{t.add_chart_desc}</span>
                    </div>
                    <button 
                      onClick={() => setIsMultiChart(!isMultiChart)}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isMultiChart ? 'bg-purple-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isMultiChart ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Chart Layouts</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-white/5 rounded-xl border border-purple-500/30 flex flex-col items-center gap-2">
                      <div className="w-full h-8 border border-white/10 rounded bg-white/5" />
                      <span className="text-[9px] font-bold text-purple-400">Single</span>
                    </button>
                    <button className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center gap-2 opacity-50">
                      <div className="w-full h-8 flex gap-1">
                        <div className="flex-1 border border-white/10 rounded bg-white/5" />
                        <div className="flex-1 border border-white/10 rounded bg-white/5" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500">Dual</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fng' && (
              <div className="flex flex-col gap-6 items-center py-4">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-white/5"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * (fngData ? parseInt(fngData.value) : 0)) / 100}
                      className={`${fngData ? getFngColor(parseInt(fngData.value)) : 'text-gray-500'} transition-all duration-1000`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-white">{fngData?.value || '--'}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${fngData ? getFngColor(parseInt(fngData.value)) : 'text-gray-500'}`}>
                      {fngData?.classification || 'Loading...'}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={14} className="text-purple-400" />
                    <span className="text-[11px] font-bold uppercase text-gray-300">{t.what_is_fng}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {t.fng_desc}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
