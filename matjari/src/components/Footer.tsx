import React from 'react';

export const Footer: React.FC = () => (
  <footer className="w-full border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 py-4 px-4 text-slate-600 dark:text-slate-400 font-cairo">
    <p className="text-center text-xs sm:text-sm">
      developed by{' '}
      <a
        href="https://daidarsoluations.com/ar"
        className="font-bold text-[#0e1f38] underline decoration-slate-300 underline-offset-4 hover:text-[#0084d6] dark:text-white dark:hover:text-sky-400"
      >
        daidarsoluations
      </a>
    </p>
  </footer>
);
