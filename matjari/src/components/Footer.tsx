import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface FooterProps {
  facebookUrl?: string;
  storeName?: string;
  logoData?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  facebookUrl = 'https://www.facebook.com/daidarsoluations/',
  storeName,
  logoData
}) => {
  const { t, isArabic } = useLanguage();
  const { isDark } = useTheme();
  const defaultLogo = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;
  const currentLogo = logoData || defaultLogo;
  const currentStoreName = storeName || (isArabic ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions');

  return (
    <footer className="w-full border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-6 px-4 sm:px-8 mt-auto text-slate-600 dark:text-slate-400 font-cairo transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
        
        {/* Brand identity with Logo */}
        <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
          <img 
            src={currentLogo} 
            alt="شعار دعيدر للحلول البرمجية" 
            className="w-8 h-8 object-contain rounded-xl shadow-xs bg-white dark:bg-slate-800 p-0.5 border border-slate-100 dark:border-slate-700"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-extrabold text-[#0e1f38] dark:text-white tracking-wide">{currentStoreName}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">{t('my_store_cloud')}</span>
        </div>

        {/* Mandatory Requirement: "Develop by", Brand Logo & Hyperlink to Facebook profile */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-[#f7fafe] dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-full px-4 py-1.5 shadow-2xs text-center">
          <span className="font-medium text-slate-500 dark:text-slate-400 text-xs">{t('develop_by')}</span>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="زيارة صفحة دعيدر للحلول البرمجية على فيسبوك"
            className="inline-flex items-center gap-1.5 font-bold text-[#0e1f38] dark:text-white hover:text-[#0084d6] dark:hover:text-sky-400 transition-colors group text-xs"
          >
            {/* Brand Logo Icon */}
            <img 
              src={defaultLogo} 
              alt="شعار المطور" 
              className="w-5 h-5 object-contain rounded-md group-hover:scale-105 transition-transform shrink-0" 
            />
            <span className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 group-hover:decoration-[#0084d6]">
              دعيدر للحلول البرمجية (Daidar Solutions)
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0084d6] transition-colors shrink-0" />
          </a>
        </div>

        {/* Cloudflare D1 Architecture Indicator */}
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
          <Database className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
          <span>Cloudflare D1 Exclusive Storage</span>
        </div>
      </div>
    </footer>
  );
};
