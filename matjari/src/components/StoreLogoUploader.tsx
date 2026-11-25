import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface StoreLogoUploaderProps {
  logoData: string;
  storeName?: string;
  isArabic: boolean;
  onSaved: (nextLogoData: string) => void | Promise<void>;
}

async function compressLogoFile(file: File, isArabic: boolean): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error(
      isArabic
        ? 'اختر صورة شعار بصيغة PNG أو JPG أو WebP.'
        : 'Please choose a PNG, JPG, or WebP logo image.'
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      isArabic ? 'حجم الصورة أكبر من 10 ميجابايت.' : 'Image file must be smaller than 10 MB.'
    );
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error(isArabic ? 'تعذر معالجة الصورة.' : 'Could not process the image.');
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Preserve transparency via WebP first, then fall back to PNG if needed
  let blob: Blob | null = null;
  for (const quality of [0.9, 0.82, 0.72, 0.62]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.type === 'image/webp' && blob.size <= 350 * 1024) break;
  }
  if (!blob || blob.size > 350 * 1024) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
  if (!blob || blob.size > 450 * 1024) {
    throw new Error(
      isArabic
        ? 'تعذر ضغط الشعار لحجم مناسب. جرّب صورة أصغر قليلًا.'
        : 'Could not compress the logo enough. Try a slightly smaller image.'
    );
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(isArabic ? 'تعذر قراءة الصورة.' : 'Could not read the image.'));
    };
    reader.onerror = () => reject(new Error(isArabic ? 'تعذر قراءة الصورة.' : 'Could not read the image.'));
    reader.readAsDataURL(blob!);
  });
}

export const StoreLogoUploader: React.FC<StoreLogoUploaderProps> = ({
  logoData,
  storeName,
  isArabic,
  onSaved,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const defaultLogo = `${import.meta.env.BASE_URL}store-mark.svg`;
  const hasCustomLogo = Boolean(logoData && logoData.trim());
  const previewSrc = hasCustomLogo ? logoData : defaultLogo;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const compressed = await compressLogoFile(file, isArabic);
      const saved = await api.updateStoreLogo(compressed);
      await onSaved(saved);
      setNotice(isArabic ? 'تم رفع وحفظ شعار متجرك بنجاح!' : 'Store logo uploaded and saved!');
      window.setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? 'تعذر رفع الشعار. حاول مرة أخرى.'
            : 'Could not upload logo. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!hasCustomLogo || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.updateStoreLogo('');
      await onSaved('');
      setNotice(isArabic ? 'تمت إزالة الشعار والعودة للأيقونة الافتراضية.' : 'Logo removed; default icon restored.');
      window.setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? 'تعذر إزالة الشعار. حاول مرة أخرى.'
            : 'Could not remove logo. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img
              src={previewSrc}
              alt={storeName || (isArabic ? 'شعار المتجر' : 'Store Logo')}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              {isArabic ? 'شعار المتجر (اللوجو)' : 'Store Logo'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-5">
              {isArabic
                ? 'يظهر شعارك في أعلى المتجر والفوتر وأيقونة التبويب. يفضّل صورة مربعة PNG أو WebP بخلفية شفافة.'
                : 'Appears in your store header, footer, and browser tab icon. Square PNG or WebP works best.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0084d6] hover:bg-[#0074bd] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {busy ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>
              {busy
                ? isArabic
                  ? 'جارٍ الحفظ…'
                  : 'Saving…'
                : hasCustomLogo
                  ? isArabic
                    ? 'تغيير اللوجو'
                    : 'Change Logo'
                  : isArabic
                    ? 'رفع اللوجو'
                    : 'Upload Logo'}
            </span>
          </button>

          {hasCustomLogo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemoveLogo()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2.5 text-xs font-bold text-rose-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'حذف' : 'Remove'}</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
