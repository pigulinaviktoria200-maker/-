
import React, { useState, useEffect } from 'react';
import { Sparkles, Send, X, Globe, TrendingUp, TrendingDown, Info, Loader2 } from 'lucide-react';
import { AIIcon } from './UI/Icons';
import { AIService, AIInsightResponse } from '../services/ai.service';
import { RowData } from '../models';
import { Language, translations } from '../src/translations';

interface AIAnalystPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeDensities: RowData[];
  language: Language;
}

const AIAnalystPanel: React.FC<AIAnalystPanelProps> = ({ isOpen, onClose, activeDensities, language }) => {
  const [insight, setInsight] = useState<AIInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const t = translations[language];

  // Reset showContent when starting new analysis
  useEffect(() => {
    if (loading) setShowContent(false);
  }, [loading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isActive = loading || isAsking;

    if (isActive) {
      setProgress(prev => (prev >= 100 ? 0 : prev));
      setLoadingStage(language === 'ru' ? 'Инициализация...' : 'Initializing...');
      
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 99) return prev;
          
          let increment = 0;
          if (prev < 30) {
            increment = 0.8 + Math.random() * 1.5;
            setLoadingStage(language === 'ru' ? 'Подключение к ядру...' : 'Connecting to core...');
          } else if (prev < 60) {
            increment = 0.4 + Math.random() * 0.8;
            setLoadingStage(language === 'ru' ? 'Поиск в сети...' : 'Searching network...');
          } else if (prev < 85) {
            increment = 0.1 + Math.random() * 0.3;
            setLoadingStage(language === 'ru' ? 'Анализ данных...' : 'Analyzing data...');
          } else {
            increment = 0.02 + Math.random() * 0.05;
            setLoadingStage(language === 'ru' ? 'Финальная сборка...' : 'Finalizing...');
          }
          
          return Math.min(prev + increment, 99);
        });
      }, 100);
    } else if (insight || chatHistory.length > 0) {
      // Smooth finish to 100%
      setLoadingStage(language === 'ru' ? 'Готово' : 'Complete');
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setShowContent(true);
            return 100;
          }
          return prev + 5; // Fast catch up
        });
      }, 30);
    }

    return () => clearInterval(interval);
  }, [loading, isAsking, language, insight, chatHistory.length]);

  const getAnalysis = async () => {
    if (activeDensities.length === 0) return;
    setLoading(true);
    const res = await AIService.analyzeMarket(activeDensities, language);
    setInsight(res);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && !insight) {
      getAnalysis();
    }
  }, [isOpen]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const userMsg = question;
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAsking(true);
    
    try {
      const answer = await AIService.askQuestion(userMsg, activeDensities, language);
      setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: t.error_fetching_ai }]);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#050505] border-l border-white/10 z-[9999] shadow-[0_0_50px_rgba(139,92,246,0.2)] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <AIIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{t.quantum_analyst}</h2>
            <p className="text-[10px] text-gray-500 font-mono">{t.gemini_integration}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-6">
        {!showContent ? (
          <div className="h-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-purple-500" size={32} />
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">{t.scanning_intel}</p>
                <span className="text-[10px] font-mono font-bold text-white">{Math.round(progress)}%</span>
              </div>
              <p className="text-[8px] font-mono text-purple-400 uppercase tracking-widest animate-pulse">{loadingStage}</p>
            </div>
          </div>
        ) : insight ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" /> {t.deep_analysis}
              </h3>
              <div className="text-sm text-gray-300 leading-relaxed font-sans bg-white/5 p-4 rounded-2xl border border-white/5 whitespace-pre-wrap">
                {insight.analysis}
              </div>
            </div>

            {insight.sources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" /> {t.grounded_sources}
                </h3>
                <div className="grid gap-2">
                  {insight.sources.map((src, i) => (
                    <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                      <span className="text-xs text-gray-400 group-hover:text-white truncate pr-4">{src.title}</span>
                      <Info size={12} className="text-gray-600 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-xs text-gray-500">{t.no_signals}</p>
          </div>
        )}

        {chatHistory.length > 0 && (
          <div className="pt-6 border-t border-white/5 space-y-4">
             {chatHistory.map((msg, i) => (
               <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 border border-white/5'}`}>
                   {msg.text}
                 </div>
               </div>
             ))}
             {isAsking && (
               <div className="flex flex-col items-center gap-1 mx-auto">
                 <div className="flex items-center gap-2">
                   <Loader2 className="animate-spin text-purple-500" size={16} />
                   <span className="text-[10px] font-mono text-white font-bold">{Math.round(progress)}%</span>
                 </div>
                 <p className="text-[8px] font-mono text-purple-400 uppercase tracking-widest animate-pulse">{loadingStage}</p>
               </div>
             )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-black">
        <form onSubmit={handleAsk} className="relative">
          <input 
            type="text" 
            placeholder={t.ask_ai_placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-purple-500 transition-all"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-400 hover:text-purple-300 transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAnalystPanel;
