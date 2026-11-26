'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
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
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)

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
    }
  }, [])

  const isAutoplayStopped =
    isPaused || isHovered || isFocused || prefersReducedMotion || !isTabVisible

  const switchToSlide = useCallback(
    (nextIndex: number, dir?: number) => {
      const normalized = ((nextIndex % slides.length) + slides.length) % slides.length
      if (normalized === activeIndex) return
      setDirection(dir ?? (normalized > activeIndex ? 1 : -1))
      setActiveIndex(normalized)
    },
    [activeIndex, slides.length]
  )

  const goNext = useCallback(() => {
    setDirection(1)
    setActiveIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (isAutoplayStopped) return
    const timer = setInterval(goNext, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [goNext, isAutoplayStopped])

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

  // RTL-aware horizontal slide offset
  const slideOffset = (isRTL ? -1 : 1) * direction * 34

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
        {/* Clean crisp showcase card (no spilled background glow) */}
        <div className="relative overflow-hidden bg-white dark:bg-[#132038] border border-[#dce6f2] dark:border-[#1e3456] rounded-3xl shadow-[0_14px_40px_rgba(15,39,68,0.08)] dark:shadow-[0_18px_46px_rgba(0,0,0,0.45)]">
          {/* Active Slide Animated Stage (Title -> Image -> Description) */}
          <div className="p-5 sm:p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, x: slideOffset, scale: 0.985 }
                }
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 0, x: -slideOffset * 0.7, scale: 0.985 }
                }
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.48,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* 1. Slide Title Row */}
                <div className="flex items-center justify-between gap-3 mb-4 min-h-[2.75rem]">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.span
                      initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, delay: 0.05 }}
                      className="w-10 h-10 rounded-xl bg-[#e6f4fe] dark:bg-[#0f2744] border border-[#bae6fd]/80 dark:border-[#1e3a5f] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <SlideIcon className="w-5 h-5" />
                    </motion.span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-snug truncate">
                      {current.title}
                    </h2>
                  </div>

                  <span
                    dir="ltr"
                    aria-hidden="true"
                    className="text-[11px] font-mono font-bold text-[#4a6080] dark:text-[#94b4d4] bg-[#f4f8fc] dark:bg-[#0f1d33] border border-[#e2ebf4] dark:border-[#1e3456] px-2.5 py-1 rounded-full flex-shrink-0"
                  >
                    {stepNumber} / {totalSteps}
                  </span>
                </div>

                {/* 2. Fixed-Aspect Service Image with subtle cinematic entrance zoom */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#e2ebf4] dark:border-[#1e3456] bg-[#eef5fb] dark:bg-[#0b1628]">
                  <motion.img
                    src={current.image}
                    alt={current.alt}
                    width={1600}
                    height={900}
                    loading="eager"
                    decoding="async"
                    initial={prefersReducedMotion ? false : { scale: 1.07 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full h-full object-cover object-center select-none"
                  />
                </div>

                {/* 3. Fixed-Min-Height Description below Image */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.4,
                    delay: prefersReducedMotion ? 0 : 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mt-4 min-h-[4.5rem] sm:min-h-[4rem] flex items-start"
                >
                  <p className="text-sm sm:text-[15px] text-[#425874] dark:text-[#9cb8d6] leading-relaxed font-medium">
                    {current.description}
                  </p>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sleek Animated Progress-Bar Indicators (no clunky boxed arrows) */}
          <div className="flex items-center gap-3 px-5 sm:px-6 pb-5 pt-1">
            <div
              className="flex-1 grid grid-cols-4 gap-2"
              role="tablist"
              aria-label={carousel.regionLabel}
            >
              {slides.map((slide, idx) => {
                const isActive = idx === activeIndex
                const isDone = idx < activeIndex
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${carousel.goToSlide}: ${slide.title}`}
                    onClick={() => switchToSlide(idx)}
                    className="group relative py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] rounded-full"
                  >
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[#e2ebf4] dark:bg-[#1d314f] group-hover:bg-[#cbd9e8] dark:group-hover:bg-[#294369] transition-colors">
                      {isActive ? (
                        <motion.span
                          key={`${slide.id}-${isAutoplayStopped ? 'paused' : 'play'}`}
                          className="block h-full rounded-full bg-gradient-to-l from-[#0284c7] to-[#38bdf8]"
                          initial={{ width: isAutoplayStopped ? '100%' : '0%' }}
                          animate={{ width: '100%' }}
                          transition={{
                            duration: isAutoplayStopped ? 0 : SLIDE_INTERVAL_MS / 1000,
                            ease: 'linear',
                          }}
                        />
                      ) : isDone ? (
                        <span className="block h-full w-full rounded-full bg-[#0284c7]/45 dark:bg-[#38bdf8]/45" />
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Minimal, discreet Pause/Resume toggle */}
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-pressed={isPaused}
              aria-label={isPaused ? carousel.play : carousel.pause}
              title={isPaused ? carousel.play : carousel.pause}
              className="w-7 h-7 rounded-full text-[#647a96] dark:text-[#94b4d4] hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-[#edf5fc] dark:hover:bg-[#1a2d48] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            >
              {isPaused ? (
                <Play className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Hidden preload images so every transition is instant */}
        <div className="sr-only" aria-hidden="true">
          {slides.map((slide) => (
            <img key={slide.id} src={slide.image} alt="" />
          ))}
        </div>
      </div>
    </div>
  )
}
