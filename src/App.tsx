import React, { useState, useMemo } from 'react';
import Dashboard from '../components/Dashboard';
import ProfilePage from '../components/ProfilePage';
import { Language } from './translations';
import { WintradingEngineService } from '../services/wintrading-engine.service';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');
  const [language, setLanguage] = useState<Language>('ru');
  
  const engine = useMemo(() => new WintradingEngineService(), []);

  return (
    <div className="h-full w-full">
      {currentPage === 'dashboard' ? (
        <Dashboard 
          onNavigateToProfile={() => setCurrentPage('profile')}
          language={language}
          setLanguage={setLanguage}
          engine={engine}
        />
      ) : (
        <ProfilePage 
          onBack={() => setCurrentPage('dashboard')}
          language={language}
        />
      )}
    </div>
  );
};

export default App;
