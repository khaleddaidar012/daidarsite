'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  Globe,
  LayoutDashboard,
  Pause,
  Play,
  ShoppingBag,
} from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface HeroServicesCarouselProps {
  locale: Locale
}

const SLIDE_INTERVAL_MS = 5000
const TRANSITION_MS = 220

const slideIcons = {
  ecommerce: ShoppingBag,
  'business-system': LayoutDashboard,
  website: Globe,
  saas: Cloud,
} as const

export function HeroServicesCarousel({ locale }: HeroServicesCarouselProps) {
  const t = getTranslations(locale)
  const { carousel } = t.hero
  const slides = carousel.slides
  const isRTL = locale === 'ar'

  const [activeIndex, setActiveIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSwapTimer = useCallback(() => {
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current)
      swapTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setPrefersReducedMotion(media.matches)
    const syncVisibility = () => setIsTabVisible(!document.hidden)

    syncMotion()
    syncVisibility()

    media.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncVisibility)

    return () => {
      media.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncVisibility)
      clearSwapTimer()
    }
  }, [clearSwapTimer])

  const isAutoplayStopped =
    isPaused || isHovered || isFocused || prefersReducedMotion || !isTabVisible

  const switchToSlide = useCallback(
    (nextIndex: number) => {
      const normalized = ((nextIndex % slides.length) + slides.length) % slides.length
      if (normalized === activeIndex) return

      clearSwapTimer()
      if (prefersReducedMotion) {
        setIsTransitioning(false)
        setActiveIndex(normalized)
        return
      }

      setIsTransitioning(true)
      swapTimerRef.current = setTimeout(() => {
        setActiveIndex(normalized)
        setIsTransitioning(false)
        swapTimerRef.current = null
      }, TRANSITION_MS)
    },
    [activeIndex, clearSwapTimer, prefersReducedMotion, slides.length]
  )

  const goNext = useCallback(() => {
    switchToSlide(activeIndex + 1)
  }, [activeIndex, switchToSlide])

  const goPrev = useCallback(() => {
    switchToSlide(activeIndex - 1)
  }, [activeIndex, switchToSlide])

  useEffect(() => {
    if (isAutoplayStopped) {
      clearSwapTimer()
      setIsTransitioning(false)
      return
    }

    const interval = setInterval(() => {
      clearSwapTimer()
      setIsTransitioning(true)
      swapTimerRef.current = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % slides.length)
        setIsTransitioning(false)
        swapTimerRef.current = null
      }, TRANSITION_MS)
    }, SLIDE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      clearSwapTimer()
    }
  }, [clearSwapTimer, isAutoplayStopped, slides.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (isRTL) goPrev()
      else goNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (isRTL) goNext()
      else goPrev()
    }
  }

  const current = slides[activeIndex]
  const SlideIcon =
    slideIcons[current.id as keyof typeof slideIcons] ?? ShoppingBag
  const stepNumber = String(activeIndex + 1).padStart(2, '0')
  const totalSteps = String(slides.length).padStart(2, '0')

  return (
    <div
      className="relative flex items-center justify-center animate-fade-in-up delay-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false)
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={carousel.regionLabel}
        aria-live="off"
        className="relative w-full max-w-lg mx-auto"
      >
        {/* Subtle brand glow behind card */}
        <div
          className="absolute inset-0 rounded-2xl opacity-15 dark:opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, #0284c7 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        {/* Showcase Card matching Daidar blue/navy identity */}
        <div className="dashboard-mock relative overflow-hidden bg-white dark:bg-[#132038] border border-[#dde3eb] dark:border-[#1e3456] rounded-2xl shadow-[0_12px_36px_rgba(18,40,64,0.10)] dark:shadow-[0_16px_42px_rgba(0,0,0,0.45)]">
          {/* Active Slide Content (Title -> Image -> Description) */}
          <div className="p-5 sm:p-6">
            {/* 1. Slide Title Row */}
            <div
              className={`flex items-center justify-between gap-3 mb-4 min-h-[2.75rem] transition-all duration-300 ease-out ${
                isTransitioning
                  ? 'opacity-0 translate-y-1'
                  : 'opacity-100 translate-y-0'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-10 h-10 rounded-xl bg-[#e6f4fe] dark:bg-[#0f2744] border border-[#bae6fd]/70 dark:border-[#1e3a5f] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <SlideIcon className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#122840] dark:text-[#e8f0fb] leading-snug truncate">
                  {current.title}
                </h2>
              </div>

              <span
                dir="ltr"
                aria-hidden="true"
                className="text-xs font-mono font-semibold text-[#4a6080] dark:text-[#94b4d4] bg-[#f1f5f9] dark:bg-[#0f1d33] border border-[#e2e8f0] dark:border-[#1e3456] px-2.5 py-1 rounded-lg flex-shrink-0"
              >
                {stepNumber} / {totalSteps}
              </span>
            </div>

            {/* 2. Fixed-Aspect Service Image (all 4 preloaded and crossfaded cleanly) */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-[#1e3456] bg-[#eef5fb] dark:bg-[#0b1628]">
              {slides.map((slide, idx) => {
                const isCurrent = idx === activeIndex
                return (
                  <img
                    key={slide.id}
                    src={slide.image}
                    alt={isCurrent ? slide.alt : ''}
                    aria-hidden={!isCurrent}
                    width={1600}
                    height={900}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover object-center select-none transition-opacity duration-300 ease-out ${
                      isCurrent && !isTransitioning
                        ? 'opacity-100 z-10'
                        : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  />
                )
              })}
            </div>

            {/* 3. Fixed-Min-Height Description below Image (prevents layout shift) */}
            <div
              className={`mt-4 min-h-[4.75rem] sm:min-h-[4.25rem] flex items-start transition-all duration-300 ease-out ${
                isTransitioning
                  ? 'opacity-0 translate-y-1'
                  : 'opacity-100 translate-y-0'
              }`}
            >
              <p className="text-sm sm:text-[15px] text-[#4a6080] dark:text-[#94b4d4] leading-relaxed font-medium">
                {current.description}
              </p>
            </div>
          </div>

          {/* Controls Bar: Dots + Prev/Next + Pause/Resume */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-[#e2e8f0] dark:border-[#1e3456] bg-[#f8fafc] dark:bg-[#0f1d33]">
            {/* Slide Indicators */}
            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label={carousel.regionLabel}
            >
              {slides.map((slide, idx) => {
                const isActive = idx === activeIndex
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${carousel.goToSlide}: ${slide.title}`}
                    onClick={() => switchToSlide(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] ${
                      isActive
                        ? 'w-7 bg-[#0284c7] dark:bg-[#38bdf8]'
                        : 'w-2.5 bg-[#cbd5e1] dark:bg-[#2a4263] hover:bg-[#94a3b8] dark:hover:bg-[#47648d]'
                    }`}
                  />
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                aria-label={carousel.previous}
                className="w-8 h-8 rounded-lg border border-[#dde3eb] dark:border-[#1e3456] bg-white dark:bg-[#132038] text-[#122840] dark:text-[#e8f0fb] hover:border-[#0284c7] hover:text-[#0284c7] dark:hover:border-[#38bdf8] dark:hover:text-[#38bdf8] flex items-center justify-center transition-colors cursor-pointer"
              >
                {isRTL ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={goNext}
                aria-label={carousel.next}
                className="w-8 h-8 rounded-lg border border-[#dde3eb] dark:border-[#1e3456] bg-white dark:bg-[#132038] text-[#122840] dark:text-[#e8f0fb] hover:border-[#0284c7] hover:text-[#0284c7] dark:hover:border-[#38bdf8] dark:hover:text-[#38bdf8] flex items-center justify-center transition-colors cursor-pointer"
              >
                {isRTL ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-pressed={isPaused}
                aria-label={isPaused ? carousel.play : carousel.pause}
                title={isPaused ? carousel.play : carousel.pause}
                className="w-8 h-8 rounded-lg border border-[#dde3eb] dark:border-[#1e3456] bg-white dark:bg-[#132038] text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e6f4fe] dark:hover:bg-[#1a2d48] flex items-center justify-center transition-colors cursor-pointer"
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
