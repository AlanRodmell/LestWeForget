import React, { useState } from 'react';
import stationeryLightImg from '../assets/images/stationery_desk_light_1794755305777.jpg';
import stationeryDarkImg from '../assets/images/stationery_desk_dark_1794755307272.jpg';

interface StationeryBackdropProps {
  variant?: 'prominent' | 'subtle';
}

export const StationeryBackdrop: React.FC<StationeryBackdropProps> = ({
  variant = 'subtle',
}) => {
  const [lightFailed, setLightFailed] = useState(false);
  const [darkFailed, setDarkFailed] = useState(false);

  const isProminent = variant === 'prominent';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#F5EFE4] dark:bg-[#16120F] transition-colors duration-700"
    >
      {/* Light mode: sunlit open linen book, cotton pages, fountain pen & twine */}
      {!lightFailed && (
        <img
          src={stationeryLightImg}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setLightFailed(true)}
          className={`block dark:hidden h-full w-full object-cover object-center transition-all duration-700 ${
            isProminent ? 'opacity-92 scale-[1.01]' : 'opacity-62'
          }`}
        />
      )}

      {/* Dark mode: brass reading lamp & leather-bound desk */}
      {!darkFailed && (
        <img
          src={stationeryDarkImg}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setDarkFailed(true)}
          className={`hidden dark:block h-full w-full object-cover object-center transition-all duration-700 ${
            isProminent ? 'opacity-88 scale-[1.01]' : 'opacity-58'
          }`}
        />
      )}

      {/* Gentle warm amber veil so text remains legible while keeping the book & desk clearly visible */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isProminent
            ? 'bg-[#F5EFE4]/14 dark:bg-[#16120F]/26'
            : 'bg-[#F5EFE4]/38 dark:bg-[#16120F]/46'
        }`}
      />

      {/* Soft orange library reading-lamp glow */}
      <div className="warm-desk-light absolute inset-0" />
    </div>
  );
};
