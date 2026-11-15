import React, { useState } from 'react';
import type { ThemeMode } from '../types';
import stationeryLightDesktopImg from '../assets/images/stationery_desk_light_1794755305777.jpg';
import stationeryDarkDesktopImg from '../assets/images/stationery_desk_dark_1794755307272.jpg';
import stationeryLightPortraitImg from '../assets/images/stationery_portrait_light_1794759466885.jpg';
import stationeryDarkPortraitImg from '../assets/images/stationery_portrait_dark_amber_1794759489284.jpg';

interface StationeryBackdropProps {
  variant?: 'prominent' | 'subtle';
  theme?: ThemeMode;
}

export const StationeryBackdrop: React.FC<StationeryBackdropProps> = React.memo(
  ({ variant = 'subtle', theme }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const isProminent = variant === 'prominent';

    // Determine active theme so the browser only downloads 1 image (via <picture> media query)
    // instead of downloading all 4 portrait/landscape + light/dark images on mobile startup
    const isDark =
      theme === 'dark' ||
      (!theme &&
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark'));

    const desktopSrc = isDark ? stationeryDarkDesktopImg : stationeryLightDesktopImg;
    const portraitSrc = isDark ? stationeryDarkPortraitImg : stationeryLightPortraitImg;

    const opacityClass = isDark
      ? isProminent
        ? 'opacity-90'
        : 'opacity-60'
      : isProminent
      ? 'opacity-92'
      : 'opacity-64';

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#EFE2CC] dark:bg-[#16120F] transition-colors duration-700"
      >
        {!imgFailed && (
          <picture className="block h-full w-full">
            <source media="(min-width: 768px)" srcSet={desktopSrc} />
            <img
              src={portraitSrc}
              alt=""
              decoding="async"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={`block h-full w-full object-cover object-center transition-opacity duration-700 ${opacityClass}`}
            />
          </picture>
        )}

        {/* Gentle warm amber veil so text remains legible while keeping the book & desk clearly visible */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            isProminent
              ? 'bg-[#F5EFE4]/14 dark:bg-[#16120F]/24'
              : 'bg-[#F5EFE4]/36 dark:bg-[#16120F]/44'
          }`}
        />

        {/* Soft orange library reading-lamp glow */}
        <div className="warm-desk-light absolute inset-0" />
      </div>
    );
  }
);
