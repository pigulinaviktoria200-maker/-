import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import { AuthMode } from './types';
import { Logo } from './components/UI/Icons';
import { AuthCard } from './components/Auth/AuthForms';
import { ToastContainer, ToastMessage, ToastType } from './components/UI/Shared';
import { QuantumCard } from './components/QuantumCard';
import './components/QuantumCard.css';
import { Language, translations } from './src/translations';
import { Globe } from 'lucide-react';
import { WintradingEngineService, CONFIG } from './services/wintrading-engine.service';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile'>('dashboard');
  const [userEmail, setUserEmail] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('se_lang');
    return (saved as Language) || 'ru';
  });

  const engineRef = useMemo(() => new WintradingEngineService(), []);

  useEffect(() => {
    const sub = engineRef.error$.subscribe(err => {
      let message = `${err.exchange} (${err.marketType}): ${err.message}`;
      if (err.isRegionalBlock) {
        message = `Binance connection blocked: Regional restriction (Error 451). Please use a different exchange or check your server region.`;
      }
      showToast(message, 'error');
    });
    return () => sub.unsubscribe();
  }, [engineRef]);

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('se_lang', language);
  }, [language]);

  useEffect(() => {
    const savedToken = localStorage.getItem('se_auth_token');
    const savedEmail = localStorage.getItem('se_user_email');
    if (savedToken && savedEmail) {
      setIsAuthenticated(true);
      setUserEmail(savedEmail);
    }
  }, []);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleLoginSuccess = (email: string) => {
    localStorage.setItem('se_auth_token', 'mock_token_' + Date.now());
    localStorage.setItem('se_user_email', email);
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('se_auth_token');
    localStorage.removeItem('se_user_email');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  if (isAuthenticated) {
    return (
      <>
        {currentView === 'profile' ? (
          <ProfilePage onBack={() => setCurrentView('dashboard')} language={language} />
        ) : (
          <Dashboard 
            onNavigateToProfile={() => setCurrentView('profile')} 
            language={language}
            setLanguage={setLanguage}
            engine={engineRef}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-auto overflow-y-auto bg-[#050505] text-white custom-scroll overscroll-behavior-none">
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(t => t.filter(x => x.id !== id))} />

      {/* --- ENHANCED BACKGROUND SYSTEM --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505]"></div>
        
        {/* 3D Perspective Grid */}
        <div className="absolute top-[20%] left-[-50%] right-[-50%] bottom-[-50%] [perspective:500px] flex justify-center opacity-20">
          <div 
            className="w-[200%] h-[200%] [transform:rotateX(60deg)] animate-grid-flow"
            style={{
              backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          ></div>
        </div>

        <div className="absolute top-0 left-0 w-full h-3/4 bg-gradient-to-b from-[#050505] via-[#050505] to-transparent z-0"></div>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>

        {/* Particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-white/10 rounded-full animate-pulse" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, width: '2px', height: '2px', animationDelay: `${Math.random()*5}s` }} />
        ))}
      </div>

      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
        <Logo animate={false} size="md" />
        
        <button 
          onClick={() => setLanguage(prev => prev === 'ru' ? 'en' : 'ru')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          <Globe size={14} className="text-purple-400" />
          {language === 'ru' ? 'RU' : 'EN'}
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 pt-20 sm:pt-32 gap-12 lg:gap-24 relative z-10 w-full max-w-7xl mx-auto">
        <div className="hidden lg:flex w-1/2 flex-col items-center animate-fade-in-up">
           <Logo animate={false} size="lg" />
           <div className="mt-12 w-full flex justify-center">
             <QuantumCard engine={engineRef} />
           </div>
        </div>

        <div className="w-full max-w-[480px] animate-scale-in">
          <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.1),transparent)] pointer-events-none"></div>
            <AuthCard 
              authMode={authMode} 
              setAuthMode={setAuthMode} 
              onLoginSuccess={handleLoginSuccess}
              showToast={showToast}
            />
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full py-8 border-t border-white/5 mt-auto">
         <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-600 gap-4 uppercase font-black tracking-widest">
            <div className="flex gap-8">
               <a href="#" className="hover:text-purple-500 transition-colors">{t.privacy}</a>
               <a href="#" className="hover:text-purple-500 transition-colors">{t.terms}</a>
               <a href="#" className="hover:text-purple-500 transition-colors">{t.support}</a>
            </div>
            <div className="font-mono">© 2025 SMARTEYE. {t.secure_protocol}.</div>
         </div>
      </footer>
    </div>
  );
};

export default App;
