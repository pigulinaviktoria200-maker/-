
import React, { useState, useEffect, useRef } from 'react';
import { AuthMode } from '../../types';
import { Input, Button, PasswordStrength, Checkbox } from '../UI/Shared';
import { GoogleIcon, DiscordIcon, MetaMaskIcon, MailIcon, LockIcon, UserIcon, HumanIcon, CheckCircle } from '../UI/Icons';

declare const google: any;

const GOOGLE_CLIENT_ID = "115832245724-723777rcgh8heqtd00nhgi92q885jntk.apps.googleusercontent.com";

export const AuthCard: React.FC<any> = ({ authMode, setAuthMode, onLoginSuccess, showToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', username: '', code: '' });
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleGoogleResponse = (response: any) => {
    setIsLoading(true);
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const user = JSON.parse(jsonPayload);
      
      setTimeout(() => {
        showToast(`Вход выполнен: ${user.name}`, 'success');
        onLoginSuccess(user.email);
        setIsLoading(false);
      }, 800);
    } catch (e) {
      showToast('Ошибка авторизации Google', 'error');
      setIsLoading(false);
    }
  };

  const handleGoogleResponseRef = useRef<any>(null);
  handleGoogleResponseRef.current = handleGoogleResponse;

  useEffect(() => {
    let mounted = true;
    const initGoogle = () => {
      if (!mounted) return;
      if (typeof google !== 'undefined') {
        try {
          // Инициализируем только один раз, чтобы избежать предупреждения GSI_LOGGER
          if (!(window as any).gsiInitialized) {
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response: any) => handleGoogleResponseRef.current?.(response),
              auto_select: false,
              use_fedcm_for_prompt: false,
            });
            (window as any).gsiInitialized = true;
          }

          // Отрисовываем стандартную кнопку Google в скрытом контейнере или заменяем ею нашу
          // Это часто помогает избежать ошибок Origin при клике
          if (googleBtnRef.current && (authMode === AuthMode.LOGIN || authMode === AuthMode.REGISTER)) {
            google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'icon',
              shape: 'circle',
              theme: 'outline',
              size: 'large',
            });
          }
        } catch (err) {
          console.error("Google Auth Init Error:", err);
        }
      } else {
        setTimeout(initGoogle, 500);
      }
    };
    initGoogle();
    return () => { mounted = false; };
  }, [authMode]);


  const triggerGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof google === 'undefined') {
      showToast('Загрузка Google SDK...', 'info');
      return;
    }
    
    // Пытаемся вызвать селектор аккаунтов
    try {
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          // Если всплывающее окно заблокировано или ошибка Origin,
          // кликаем по невидимой стандартной кнопке
          const btn = googleBtnRef.current?.querySelector('div[role="button"]') as HTMLElement;
          if (btn) {
            btn.click();
          } else {
            showToast('Ошибка конфигурации: Проверьте Authorized Origins в Google Console', 'error');
          }
        }
      });
    } catch (err) {
      showToast('Ошибка вызова Google', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified && (authMode === AuthMode.LOGIN || authMode === AuthMode.REGISTER)) {
        showToast('Подтвердите, что вы человек', 'error');
        return;
    }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    
    if (authMode === AuthMode.LOGIN || authMode === AuthMode.REGISTER) {
      onLoginSuccess(formData.email);
      showToast('Доступ разрешен', 'success');
    } else if (authMode === AuthMode.RESET) {
      setAuthMode(AuthMode.VERIFY);
      showToast('Код отправлен', 'info');
    } else {
      setAuthMode(AuthMode.LOGIN);
    }
    setIsLoading(false);
  };

  const isLogin = authMode === AuthMode.LOGIN;
  const isRegister = authMode === AuthMode.REGISTER;

  return (
    <div className="w-full">
      {(isLogin || isRegister) && (
        <div className="flex p-1 mb-4 sm:mb-6 bg-white/5 rounded-xl border border-white/5 relative">
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-purple-600 rounded-lg transition-all duration-300 ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}></div>
          <button type="button" onClick={() => setAuthMode(AuthMode.LOGIN)} className={`flex-1 relative z-10 py-2 text-xs font-black uppercase tracking-widest transition-colors ${isLogin ? 'text-white' : 'text-gray-500'}`}>Вход</button>
          <button type="button" onClick={() => setAuthMode(AuthMode.REGISTER)} className={`flex-1 relative z-10 py-2 text-xs font-black uppercase tracking-widest transition-colors ${isRegister ? 'text-white' : 'text-gray-500'}`}>Регистрация</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && <Input label="Имя пользователя" placeholder="@trader_king" icon={<UserIcon className="w-5 h-5" />} value={formData.username} onChange={(e: any) => setFormData({...formData, username: e.target.value})} />}
        
        {(authMode !== AuthMode.VERIFY) && <Input label="Email" type="email" placeholder="trade@smarteye.io" icon={<MailIcon className="w-5 h-5" />} value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />}
        
        {(isLogin || isRegister) && <div className="space-y-2">
            <Input label="Пароль" type="password" placeholder="••••••••" icon={<LockIcon className="w-5 h-5" />} value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
            {isRegister && <PasswordStrength password={formData.password} />}
        </div>}

        {authMode === AuthMode.VERIFY && <Input label="Код подтверждения" placeholder="000-000" className="text-center text-2xl tracking-[0.5em]" value={formData.code} onChange={(e: any) => setFormData({...formData, code: e.target.value})} />}

        {isLogin && <div className="flex justify-end"><button type="button" onClick={() => setAuthMode(AuthMode.RESET)} className="text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300">Забыли пароль?</button></div>}

        {(isLogin || isRegister) && (
          <div onClick={() => setCaptchaVerified(!captchaVerified)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${captchaVerified ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 hover:border-purple-500/50'}`}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${captchaVerified ? 'bg-purple-600 border-purple-600' : 'border-white/20'}`}>{captchaVerified && <CheckCircle className="w-4 h-4 text-white" />}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono"><HumanIcon className="w-4 h-4" /><span>Я человек</span></div>
          </div>
        )}

        {isRegister && <Checkbox label="Принимаю условия использования" checked={termsAccepted} onChange={setTermsAccepted} />}

        <Button type="submit" isLoading={isLoading}>{isLogin ? 'Войти в терминал' : isRegister ? 'Создать аккаунт' : 'Продолжить'}</Button>

        {(isLogin || isRegister) && (
          <div className="pt-2 sm:pt-4">
            <div className="relative flex items-center mb-2 sm:mb-4"><div className="flex-grow border-t border-white/10"></div><span className="mx-3 text-[9px] text-gray-600 uppercase font-black tracking-widest">Или войти через</span><div className="flex-grow border-t border-white/10"></div></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative group/google">
                {/* Скрытый контейнер для реальной кнопки Google SDK */}
                <div ref={googleBtnRef} className="absolute inset-0 opacity-0 pointer-events-none z-0"></div>
                <Button type="button" variant="social" onClick={triggerGoogleLogin} disabled={isLoading}>
                  <GoogleIcon className="w-5 h-5" />
                </Button>
              </div>
              <Button type="button" variant="social"><MetaMaskIcon className="w-6 h-6" /></Button>
              <Button type="button" variant="social"><DiscordIcon className="w-5 h-5" /></Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
