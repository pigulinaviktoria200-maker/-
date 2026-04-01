import React, { useState } from 'react';
import { User, Mail, Calendar, CheckCircle, Star, Link as LinkIcon, ExternalLink, Shield, MessageCircle, ArrowLeft, Copy, BookOpen, Users, Check, Globe, CreditCard, Bitcoin, Zap, CircleDot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../src/translations';

interface ProfilePageProps {
  onBack: () => void;
  language: Language;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, language }) => {
  const t = translations[language];
  const [userEmail] = useState('user@example.com');
  const [joinDate] = useState('24 сентября 2025');
  const [premiumEndDate] = useState('27 сентября 2025');
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'affiliate' | 'guide'>('subscription');
  const [copied, setCopied] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '3months' | '1year'>('1year');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'crypto'>('crypto');

  const plans = {
    '1month': {
      id: '1month',
      name: t.plan_1month,
      period: t.plan_1month,
      price: 19,
      displayPrice: '$19',
      originalPrice: '$25',
      discount: '24%',
      endDate: language === 'ru' ? '27 апреля 2026 г.' : 'April 27, 2026'
    },
    '3months': {
      id: '3months',
      name: t.plan_3months,
      period: t.plan_3months,
      price: 49,
      displayPrice: '$49',
      originalPrice: '$75',
      discount: '35%',
      endDate: language === 'ru' ? '27 июня 2026 г.' : 'June 27, 2026'
    },
    '1year': {
      id: '1year',
      name: t.plan_1year,
      period: t.plan_1year,
      price: 174,
      displayPrice: '$174',
      originalPrice: '$300',
      discount: '42%',
      endDate: language === 'ru' ? '27 марта 2027 г.' : 'March 27, 2027'
    }
  };

  const referralLink = `https://smarteye.app/ref/user_${Math.random().toString(36).substring(7)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white relative font-sans selection:bg-purple-500/30 custom-scroll">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/05 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 px-4 md:px-12 lg:px-20 py-4 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-all"><ArrowLeft size={18} /></div>
            <span className="text-sm font-medium hidden sm:inline">Вернуться в панель</span>
          </button>
          <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-2">
            <img 
              src="https://preview.redd.it/j3k0qgv035qg1.png?auto=webp&s=8a0f5c12b0240a693767eed650baa3ab3a8088cd" 
              alt="Logo" 
              className="w-6 h-6 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-rajdhani font-bold tracking-widest text-white uppercase">SmartEye</span>
          </div>

          <div className="h-6 w-px bg-white/10 mx-2 hidden xl:block"></div>
          
          <div className="hidden md:flex items-center gap-1 bg-[#0c0c0e]/60 p-1.5 rounded-full border border-white/5 shadow-inner backdrop-blur-xl">
            {[
              { id: 'profile', label: t.profile, icon: User },
              { id: 'subscription', label: t.subscription, icon: Star },
              { id: 'affiliate', label: t.affiliate, icon: Users },
              { id: 'guide', label: t.guide, icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-500 backdrop-blur-md ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border border-white/10 shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                <tab.icon size={14} strokeWidth={2.5} className={activeTab === tab.id ? 'text-white' : 'text-gray-500'} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-full px-4 md:px-12 lg:px-20 py-8">
        <div className="space-y-6">
          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0 space-y-6">
            {activeTab === 'subscription' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Plans Section */}
                  <div className="lg:col-span-8">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 xl:gap-8">
                      {/* 1 Month */}
                      <div 
                        onClick={() => setSelectedPlan('1month')}
                        className={`group relative flex flex-col p-3 sm:p-8 xl:p-10 rounded-2xl sm:rounded-[2.5rem] xl:rounded-[3rem] transition-all duration-500 cursor-pointer border backdrop-blur-3xl overflow-hidden h-full min-h-[160px] landscape:min-h-[110px] sm:min-h-[260px] sm:landscape:min-h-[180px] xl:min-h-[320px] hover:scale-[1.03] active:scale-[0.97] ${
                          selectedPlan === '1month' 
                          ? 'bg-[#121215]/95 border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.12)]' 
                          : 'bg-[#0c0c0e]/80 border-white/5 hover:border-white/10 hover:bg-[#121215]/90'
                        }`}
                      >
                        <div className="absolute top-0 right-0 bg-[#ff4d4d] px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 rounded-tr-2xl sm:rounded-tr-[2.5rem] xl:rounded-tr-[3rem] rounded-bl-lg sm:rounded-bl-[1.5rem] xl:rounded-bl-[2rem] shadow-xl z-20">
                          <div className="text-white text-[7px] sm:text-[9px] xl:text-[11px] font-black uppercase tracking-wider">
                            СКИДКА -24%
                          </div>
                        </div>
                        <div className="relative z-10 mb-4 landscape:mb-2 sm:mb-8 pt-6 landscape:pt-4 sm:pt-10">
                          <div className="flex items-start gap-1 sm:gap-2">
                            <span className="text-xl sm:text-4xl xl:text-6xl font-black text-white tracking-tighter">$19</span>
                            <div className="relative -mt-0.5 sm:-mt-2">
                              <span className="text-[10px] sm:text-[20px] text-gray-400/80 font-black leading-none tracking-tighter">$25</span>
                              <div className="absolute top-1/2 left-[-10%] w-[120%] h-[1px] sm:h-[2px] bg-red-500/70 -rotate-12 origin-center" />
                            </div>
                          </div>
                        </div>
                        <div className="relative z-10 flex-1">
                          <div className="text-xs sm:text-2xl font-black text-white mb-0.5 sm:mb-2 tracking-tight">1 месяц</div>
                          <div className="text-[8px] sm:text-sm text-gray-500 font-bold">Базовый доступ</div>
                        </div>
                        <div className="relative z-10 mt-4 landscape:mt-2 sm:mt-8">
                          <button className={`w-full py-2 sm:py-5 rounded-xl sm:rounded-2xl text-[8px] sm:text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${
                            selectedPlan === '1month' 
                            ? 'bg-white text-black shadow-[0_15px_35px_rgba(255,255,255,0.25)]' 
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
                          }`}>
                            {selectedPlan === '1month' ? (
                              <>
                                <span className="hidden sm:inline">ВЫБРАНО</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">ВЫБРАТЬ</span>
                                <span className="sm:hidden">ВЫБРАТЬ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 3 Months */}
                      <div 
                        onClick={() => setSelectedPlan('3months')}
                        className={`group relative flex flex-col p-3 sm:p-8 xl:p-10 rounded-2xl sm:rounded-[2.5rem] xl:rounded-[3rem] transition-all duration-500 cursor-pointer border backdrop-blur-3xl overflow-hidden h-full min-h-[160px] landscape:min-h-[110px] sm:min-h-[260px] sm:landscape:min-h-[180px] xl:min-h-[320px] hover:scale-[1.03] active:scale-[0.97] ${
                          selectedPlan === '3months' 
                          ? 'bg-[#121215]/95 border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.12)]' 
                          : 'bg-[#0c0c0e]/80 border-white/5 hover:border-white/10 hover:bg-[#121215]/90'
                        }`}
                      >
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/10 blur-[100px] group-hover:bg-purple-600/20 transition-all duration-700" />
                        <div className="absolute top-0 right-0 bg-[#ff4d4d] px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 rounded-tr-2xl sm:rounded-tr-[2.5rem] xl:rounded-tr-[3rem] rounded-bl-lg sm:rounded-bl-[1.5rem] xl:rounded-bl-[2rem] shadow-xl z-20">
                          <div className="text-white text-[7px] sm:text-[9px] xl:text-[11px] font-black uppercase tracking-wider">
                            СКИДКА -35%
                          </div>
                        </div>
                        <div className="relative z-10 mb-4 landscape:mb-2 sm:mb-8 pt-6 landscape:pt-4 sm:pt-10">
                          <div className="flex items-start gap-1 sm:gap-2">
                            <span className="text-xl sm:text-4xl xl:text-6xl font-black text-white tracking-tighter">$49</span>
                            <div className="relative -mt-0.5 sm:-mt-2">
                              <span className="text-[10px] sm:text-[20px] text-gray-400/80 font-black leading-none tracking-tighter">$75</span>
                              <div className="absolute top-1/2 left-[-10%] w-[120%] h-[1px] sm:h-[2px] bg-red-500/70 -rotate-12 origin-center" />
                            </div>
                          </div>
                        </div>
                        <div className="relative z-10 flex-1">
                          <div className="text-xs sm:text-2xl font-black text-white mb-0.5 sm:mb-2 tracking-tight">3 месяца</div>
                          <div className="text-[8px] sm:text-sm text-gray-400 font-bold">$16 <span className="text-gray-500">/ мес</span></div>
                        </div>
                        <div className="relative z-10 mt-4 landscape:mt-2 sm:mt-8">
                          <button className={`w-full py-2 sm:py-5 rounded-xl sm:rounded-2xl text-[8px] sm:text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${
                            selectedPlan === '3months' 
                            ? 'bg-white text-black shadow-[0_15px_35px_rgba(255,255,255,0.25)]' 
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
                          }`}>
                            {selectedPlan === '3months' ? (
                              <>
                                <span className="hidden sm:inline">ВЫБРАНО</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">ВЫБРАТЬ</span>
                                <span className="sm:hidden">ВЫБРАТЬ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 1 Year */}
                      <div 
                        onClick={() => setSelectedPlan('1year')}
                        className={`group relative flex flex-col p-3 sm:p-8 xl:p-10 rounded-2xl sm:rounded-[2.5rem] xl:rounded-[3rem] transition-all duration-500 cursor-pointer border backdrop-blur-3xl overflow-hidden h-full min-h-[160px] landscape:min-h-[110px] sm:min-h-[260px] sm:landscape:min-h-[180px] xl:min-h-[320px] hover:scale-[1.03] active:scale-[0.97] ${
                          selectedPlan === '1year' 
                          ? 'bg-[#121215]/95 border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.12)]' 
                          : 'bg-[#0c0c0e]/80 border-white/5 hover:border-white/10 hover:bg-[#121215]/90'
                        }`}
                      >
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-400 via-purple-500 to-rose-500 px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 rounded-tr-2xl sm:rounded-tr-[2.5rem] xl:rounded-tr-[3rem] rounded-bl-lg sm:rounded-bl-[1.5rem] xl:rounded-bl-[2rem] shadow-xl z-20">
                          <div className="text-white text-[7px] sm:text-[9px] xl:text-[11px] font-black uppercase tracking-wider">
                            СКИДКА -42%
                          </div>
                        </div>
                        <div className="relative z-10 mb-4 landscape:mb-2 sm:mb-8 pt-6 landscape:pt-4 sm:pt-10">
                          <div className="flex items-start gap-1 sm:gap-2">
                            <span className="text-xl sm:text-4xl xl:text-6xl font-black text-white tracking-tighter">$174</span>
                            <div className="relative -mt-0.5 sm:-mt-2">
                              <span className="text-[10px] sm:text-[20px] text-gray-400/80 font-black leading-none tracking-tighter">$300</span>
                              <div className="absolute top-1/2 left-[-10%] w-[120%] h-[1px] sm:h-[2px] bg-red-500/70 -rotate-12 origin-center" />
                            </div>
                          </div>
                        </div>
                        <div className="relative z-10 flex-1">
                          <div className="text-xs sm:text-2xl font-black text-white mb-0.5 sm:mb-2 tracking-tight">1 год</div>
                          <div className="text-[8px] sm:text-sm text-gray-400 font-bold">$14 <span className="text-gray-500">/ мес</span></div>
                        </div>
                        <div className="relative z-10 mt-4 landscape:mt-2 sm:mt-8">
                          <button className={`w-full py-2 sm:py-5 rounded-xl sm:rounded-2xl text-[8px] sm:text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${
                            selectedPlan === '1year' 
                            ? 'bg-white text-black shadow-[0_15px_35px_rgba(255,255,255,0.25)]' 
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
                          }`}>
                            {selectedPlan === '1year' ? (
                              <>
                                <span className="hidden sm:inline">ВЫБРАНО</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">ВЫБРАТЬ</span>
                                <span className="sm:hidden">ВЫБРАТЬ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Right Column: Checkout Section */}
                <div className="lg:col-span-4 lg:row-span-2 w-full max-w-md mx-auto lg:max-w-none lg:mx-0 bg-[#0c0c0e]/90 border border-[#222225] rounded-[2.5rem] p-6 space-y-6 flex flex-col relative overflow-hidden group backdrop-blur-2xl hover:border-[#333338] transition-colors">
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] -ml-32 -mb-32 group-hover:bg-purple-600/10 transition-all duration-1000" />
                  <h3 className="text-xl font-black text-white tracking-tight">Оплата</h3>
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-[#0c0c0e]/60 border border-white/5 backdrop-blur-md transition-all">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Период</span>
                      <span className="text-xs font-black text-white uppercase tracking-wider">{plans[selectedPlan].period}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-[#0c0c0e]/60 border border-white/5 backdrop-blur-md transition-all">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Окончание</span>
                      <span className="text-xs font-black text-white tracking-tight">{plans[selectedPlan].endDate}</span>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-6">
                    <div className="space-y-3">
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">Способ оплаты</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSelectedMethod('card')}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                            selectedMethod === 'card' 
                            ? 'bg-[#121215]/90 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.1)]' 
                            : 'bg-[#0c0c0e]/50 border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                          }`}
                        >
                          <CreditCard size={20} className={`flex-shrink-0 transition-colors ${selectedMethod === 'card' ? 'text-white' : 'text-gray-500'}`} />
                          <div className="text-left overflow-hidden">
                            <div className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedMethod === 'card' ? 'text-white' : 'text-gray-500'}`}>
                              Card
                            </div>
                            <div className="text-[8px] text-gray-600 font-bold truncate">Visa, MC, MIR</div>
                          </div>
                        </button>

                        <button 
                          onClick={() => setSelectedMethod('crypto')}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                            selectedMethod === 'crypto' 
                            ? 'bg-[#121215]/90 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.1)]' 
                            : 'bg-[#0c0c0e]/50 border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                          }`}
                        >
                          <Bitcoin size={20} className={`flex-shrink-0 transition-colors ${selectedMethod === 'crypto' ? 'text-[#F7931A]' : 'text-gray-500'}`} />
                          <div className="text-left overflow-hidden">
                            <div className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedMethod === 'crypto' ? 'text-white' : 'text-gray-500'}`}>
                              Crypto
                            </div>
                            <div className="text-[8px] text-gray-600 font-bold truncate">USDT, BTC, TON</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="relative group/input">
                        <input 
                          type="text" 
                          placeholder="Промокод" 
                          className="w-full bg-[#0c0c0e]/80 border border-purple-500/30 rounded-xl px-4 py-4 text-xs text-white focus:outline-none focus:border-purple-500/60 transition-colors pr-24 font-bold placeholder:text-gray-600 backdrop-blur-md"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                        />
                      <button className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-md active:scale-95 border ${promoCode ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/10 text-gray-500 border-white/10 group-focus-within/input:bg-white group-focus-within/input:text-black group-focus-within/input:border-white hover:bg-white/20'}`}>
                        Применить
                      </button>
                    </div>

                    <div className="flex items-end justify-between gap-4 flex-wrap">
                      <div className="flex-shrink-0">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">К оплате</div>
                        <div className="text-4xl font-black text-white tracking-tighter leading-none whitespace-nowrap">
                          {plans[selectedPlan].displayPrice}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {plans[selectedPlan].originalPrice && (
                          <div className="relative">
                            <span className="text-sm text-gray-400 font-bold leading-none">{plans[selectedPlan].originalPrice}</span>
                            <div className="absolute top-1/2 left-[-10%] w-[120%] h-[1.5px] bg-red-500/60 -rotate-12 origin-center" />
                          </div>
                        )}
                        <div className={`px-3 py-1.5 rounded-tr-2xl rounded-bl-xl shadow-lg flex-shrink-0 ${
                          selectedPlan === '1year' 
                          ? 'bg-gradient-to-r from-blue-400 via-purple-500 to-rose-500' 
                          : 'bg-[#ff4d4d]'
                        }`}>
                          <div className="text-white text-[9px] font-black uppercase tracking-wider">
                            СКИДКА -{plans[selectedPlan].discount || '0%'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 relative z-10 border-t border-white/5 mt-auto space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div 
                        onClick={() => setTermsAccepted(!termsAccepted)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                          termsAccepted 
                          ? 'bg-purple-600 border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)] scale-105' 
                          : 'bg-black/40 border-white/20 group-hover:border-white/40'
                        }`}
                      >
                        {termsAccepted && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <span className="text-[9px] text-gray-500 leading-relaxed font-bold">
                        Я согласен с <span className="text-white hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30">условиями</span> и <span className="text-white hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30">политикой</span>.
                      </span>
                    </label>

                    <button className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500">
                      ОПЛАТИТЬ СЕЙЧАС
                    </button>
                  </div>
                </div>

                {/* Features Section */}
                <div className="lg:col-span-8 bg-[#0c0c0e]/80 border border-[#222225] rounded-[2rem] p-6 relative overflow-hidden group backdrop-blur-2xl hover:border-[#333338] transition-colors">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 blur-[80px] -mr-24 -mt-24 group-hover:bg-purple-600/10 transition-all duration-1000" />
                  <h3 className="text-2xl font-black text-white mb-6 tracking-tight">
                    {language === 'ru' ? (
                      <>
                        {t.premium_features.split(' ')[0]} <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-rose-500 bg-clip-text text-transparent">{t.premium_features.split(' ')[1]}</span>
                      </>
                    ) : (
                      <>
                        <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-rose-500 bg-clip-text text-transparent">{t.premium_features.split(' ')[0]}</span> {t.premium_features.split(' ')[1]}
                      </>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { title: t.feature_density, desc: t.feature_density_desc },
                      { title: t.feature_ai, desc: t.feature_ai_desc },
                      { title: t.feature_screener, desc: t.feature_screener_desc },
                      { title: t.feature_charts, desc: t.feature_charts_desc },
                      { title: t.feature_alerts, desc: t.feature_alerts_desc },
                      { title: t.feature_simulator, desc: t.feature_simulator_desc },
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md hover:border-purple-500/30 hover:bg-white/[0.04] transition-all duration-300 group/item">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-purple-500/20 transition-all">
                          <Check size={16} className="text-purple-400" strokeWidth={3} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-white tracking-tight leading-tight mb-0.5">
                            {feature.title}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold leading-tight">
                            {feature.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center backdrop-blur-2xl hover:border-white/10 transition-colors">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center relative overflow-hidden group shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                      <User size={64} className="text-purple-400/80 group-hover:text-purple-300 transition-all" />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-[#0a0a0a] rounded-full shadow-lg" title="Online"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Учетная запись</h2>
                  <p className="text-gray-400 text-base mb-8 font-mono">{userEmail}</p>

                  <div className="w-full max-w-md space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <Calendar size={20} className="text-gray-400" />
                        <div className="text-left">
                          <div className="text-[10px] text-gray-500 uppercase font-bold">Дата подключения</div>
                          <div className="text-sm text-gray-200">{joinDate}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <Mail size={20} className="text-green-400" />
                        <div className="text-left">
                          <div className="text-[10px] text-green-500/70 uppercase font-bold">Статус почты</div>
                          <div className="text-sm text-green-400 font-medium flex items-center gap-1">Подтверждена <CheckCircle size={12} /></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-900/10 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="text-[10px] bg-gradient-to-r from-blue-400 via-purple-500 to-rose-500 bg-clip-text text-transparent uppercase font-bold">{t.subscription}</div>
                          <div className="text-sm text-white font-medium">До {premiumEndDate}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-8 backdrop-blur-2xl hover:border-white/10 transition-colors">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2"><LinkIcon size={16}/> 🔗 Ссылки</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Telegram', subtitle: '@tiger_trade_official', icon: <MessageCircle size={20} />, link: 'https://t.me/tiger_trade_official' },
                      { title: 'Конфиденциальность', subtitle: 'Читать условия', icon: <Shield size={20} />, link: '/privacy' },
                      { title: 'Техподдержка', subtitle: 'Написать в SMARTEYE', icon: <User size={20} />, link: 'https://t.me/tiger_trade_official' },
                    ].map((item, idx)=>(
                      <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 backdrop-blur-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-black/40 rounded-lg text-gray-400 group-hover:text-white transition-colors">{item.icon}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-200 group-hover:text-white">{item.title}</div>
                            <div className="text-xs text-gray-500">{item.subtitle}</div>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-600 group-hover:text-gray-300" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'affiliate' && (
              <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-8 backdrop-blur-2xl hover:border-white/10 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-5xl mx-auto text-center">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                    <Users size={40} className="text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Партнерская программа</h2>
                  <p className="text-gray-400 mb-8">Приглашайте друзей и получайте бонусы за их активность в SmartEye. Ваша персональная ссылка ниже:</p>
                  
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center gap-4 p-4 bg-black border border-white/10 rounded-2xl">
                      <div className="flex-1 text-left font-mono text-sm text-purple-300 truncate px-2">
                        {referralLink}
                      </div>
                      <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="text-2xl font-bold text-white mb-1">0</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Рефералов</div>
                    </div>
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="text-2xl font-bold text-white mb-1">0%</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ваша ставка</div>
                    </div>
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="text-2xl font-bold text-white mb-1">$0.00</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Заработано</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-8 backdrop-blur-2xl hover:border-white/10 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <BookOpen size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">📘 РУКОВОДСТВО МАСТЕРА ПЛОТНОСТЕЙ</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">База знаний для эффективной торговли</p>
                  </div>
                </div>

                <div className="space-y-4 max-w-6xl">
                  {[
                    {
                      id: 1,
                      question: "Как правильно заходить в сделку?",
                      answer: (
                        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                          <p>• Если вы хотите оттолкнуться от плотности, заходите в сделку, когда цена дойдет до уровня, «заденет» его, и если проедание не идет агрессивно — это точка входа.</p>
                          <p>• <span className="text-red-400/80">Stop-Loss</span> ставится строго за плотностью.</p>
                          <p>• Можно выйти раньше: если вы зашли и видите, что больше половины плотности уже разъели — лучше закрыться, не дожидаясь полного поглощения.</p>
                          <p>• Если плотность «задвигают» (пододвигают ближе к текущей цене) — пододвигайте свой стоп-лосс вслед за ней.</p>
                          <p>• Если плотность переставляют дальше от цены — это повод выйти, так как это может быть манипуляция.</p>
                        </div>
                      )
                    },
                    {
                      id: 2,
                      question: "Как правильно выйти?",
                      answer: (
                        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                          <p>• При входе стоп-лосс всегда за плотностью.</p>
                          <p>• Если начинается агрессивное рыночное проедание — выходите заранее.</p>
                          <p>• Если плотность начали переставлять дальше от цены, это может быть робот или маркетмейкер — в таких случаях лучше зафиксировать результат или выйти в безубыток.</p>
                        </div>
                      )
                    },
                    {
                      id: 3,
                      question: "Какие плотности лучше отрабатывать?",
                      answer: (
                        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                          <p>• Выбирайте волатильные монеты с хорошей капитализацией (объем торгов за 24ч от <span className="text-green-400/80">$50,000</span>).</p>
                          <p>• Избегайте «рваных» графиков, где цена движется прыжками или замирает. График должен быть «живым» и активным.</p>
                        </div>
                      )
                    },
                    {
                      id: 4,
                      question: "Как определить ловушку маркетмейкера?",
                      answer: (
                        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                          <p>• Если при первом касании цены более половины плотности мгновенно исчезает — это маркетмейкер (спуфинг).</p>
                          <p>• Если в стакане с двух сторон на одном уровне стоят плотности и они синхронно перемещаются — это работа алгоритма маркетмейкера.</p>
                        </div>
                      )
                    },
                    {
                      id: 5,
                      question: "Какие ошибки допускают новички чаще всего?",
                      answer: (
                        <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                          <p>• <span className="text-white/90">Отсутствие знаний:</span> вход в сделку без понимания механики стакана.</p>
                          <p>• <span className="text-white/90">Нарушение риск-менеджмента:</span> использование разных сумм в каждой сделке. У вас должен быть фиксированный риск на сделку.</p>
                        </div>
                      )
                    }
                  ].map((item) => (
                    <div key={item.id} className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.05] transition-all">
                      <button 
                        onClick={() => setOpenAccordion(openAccordion === item.id ? null : item.id)}
                        className="w-full flex items-center justify-between p-5 text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-400 group-hover:text-white group-hover:bg-purple-500/20 transition-all">
                            {item.id}
                          </span>
                          <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                            {item.question}
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: openAccordion === item.id ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="text-gray-500 group-hover:text-white"
                        >
                          <ArrowLeft size={16} className="-rotate-90" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {openAccordion === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-5 pt-0 pl-[68px]">
                              <div className="h-px bg-white/5 mb-4 w-full" />
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 pt-8 border-t border-white/5">
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-md">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                        <Shield size={16} className="text-purple-400" /> Почему стакан?
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Скорость, визуализация намерений крупных игроков и экономия на комиссиях за счет лимитных ордеров.</p>
                    </div>
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-md">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                        <ExternalLink size={16} className="text-blue-400" /> Какой выбрать?
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Популярные терминалы — TigerTrade и CScalp. Поддерживают все основные биржи.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-white/10 mt-8 backdrop-blur-md">
                    <h4 className="font-bold text-white mb-3">💡 Полезные советы</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                      <li className="flex gap-3"><span className="text-purple-400 font-bold">•</span> Используйте Tiger.com Broker для кешбэка комиссий до 82%.</li>
                      <li className="flex gap-3"><span className="text-purple-400 font-bold">•</span> Binance — лучшая биржа для торговли по плотностям.</li>
                      <li className="flex gap-3"><span className="text-purple-400 font-bold">•</span> Настройте звуковые алерты в SmartEye, чтобы не ждать "стоя".</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
