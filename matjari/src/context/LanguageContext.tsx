import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

type Lang = 'ar' | 'en';

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  toggleLanguage: () => void;
  isArabic: boolean;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  toggleLang: () => {},
  toggleLanguage: () => {},
  isArabic: true,
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLanguage?:Lang }> = ({ children, initialLanguage }) => {
  const [lang, setLang] = useState<Lang>(() => {
    if(initialLanguage)return initialLanguage;
    const saved = typeof window==='undefined'?null:localStorage.getItem('my_store_lang');
    return (saved === 'en' ? 'en' : 'ar') as Lang;
  });

  useEffect(() => {
    localStorage.setItem('my_store_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.style.textAlign = lang === 'ar' ? 'right' : 'left';
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  const t = (key: string): string => {
    const dict = translations[lang];
    return (dict as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, toggleLanguage: toggleLang, isArabic: lang === 'ar', t }}>
      {children}
    </LanguageContext.Provider>
  );
};
