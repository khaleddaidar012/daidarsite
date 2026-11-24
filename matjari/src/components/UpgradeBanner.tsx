import React from 'react';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

interface UpgradeBannerProps {
  isArabic: boolean;
  onAction: () => void;
  subtitle?: string;
  compact?: boolean;
  actionLabel?: string;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  isArabic,
  onAction,
  subtitle,
  compact = false,
  actionLabel,
}) => {
  const title = isArabic ? 'الحساب بحاجة إلى الترقية' : 'Your account needs an upgrade';
  const buttonText = actionLabel || (isArabic ? 'الاشتراك والترقية' : 'Subscribe & upgrade');

  return (
    <div
      role="status"
      data-upgrade-banner="true"
      dir={isArabic ? 'rtl' : 'ltr'}
      className={
        compact
          ? 'bg-orange-600 text-white border-b border-orange-700/60 px-3 py-2.5 sm:px-6'
          : 'rounded-2xl border border-orange-500/80 bg-gradient-to-l from-orange-600 to-orange-500 p-4 text-white shadow-md shadow-orange-500/15 sm:px-5'
      }
    >
      <div
        className={
          compact
            ? 'mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5'
            : 'flex flex-wrap items-center justify-between gap-3'
        }
      >
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:mt-0"
          >
            <AlertCircle className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className={compact ? 'text-xs font-black sm:text-sm' : 'text-sm font-black sm:text-base'}>
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[11px] font-semibold leading-5 text-orange-50 sm:text-xs">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-orange-700 shadow-sm transition hover:bg-orange-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
        >
          <span>{buttonText}</span>
          {isArabic ? (
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
