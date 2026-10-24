import React, { useState } from 'react';
import { sounds } from '../../utils/sound';

interface HeroOverlayProps {
  onExploreDemo: () => void;
  onSeeHowItWorks: () => void;
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({
  onExploreDemo,
  onSeeHowItWorks,
}) => {
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const handleDemoClick = () => {
    sounds.playClick();
    onExploreDemo();
  };

  const handleHowClick = () => {
    sounds.playClick();
    onSeeHowItWorks();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pt-28 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full z-10">
      {/* Top Hero Text Overlay — Positioned carefully to let shopkeeper & customer breathe */}
      <div className="max-w-3xl pointer-events-auto">
        {/* Small introductory label */}
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="font-poppins text-xs sm:text-sm font-semibold tracking-widest text-[#FFC5AA] uppercase">
            VOICE ORDER VERIFICATION / INDIA
          </span>
          <span className="text-[#FF9D9D] text-xs">●</span>
          <span className="font-poppins text-xs text-[#EEF8CD]/70">
            किराना आवाज स्पष्टीकरण
          </span>
        </div>

        {/* Main Headline in Jaro */}
        <h1
          className="font-jaro text-4xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight text-[#EEF8CD] drop-shadow-md mb-5"
          style={{ textWrap: 'balance' }}
        >
          A voice order should never be a{' '}
          <span className="text-[#FF9D9D] underline decoration-[#FFC5AA]/40 underline-offset-8">
            guess.
          </span>
        </h1>

        {/* Supporting Text in Poppins */}
        <p className="font-poppins text-base sm:text-xl text-[#EEF8CD]/90 font-normal leading-relaxed max-w-2xl mb-8 drop-shadow-sm">
          Speak naturally. Catch unclear details. Confirm the order before the bill.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleDemoClick}
            className="px-6 py-3.5 text-sm sm:text-base font-poppins font-semibold text-[#191E1B] bg-[#FF9D9D] hover:bg-[#FFC5AA] active:scale-95 transition-all duration-200 rounded-lg shadow-lg hover:shadow-xl focus-visible:outline-2 focus-visible:outline-[#FF9D9D] cursor-pointer"
          >
            Explore the demo
          </button>

          <button
            onClick={handleHowClick}
            className="px-6 py-3.5 text-sm sm:text-base font-poppins font-semibold text-[#EEF8CD] bg-[#191E1B]/60 hover:bg-[#191E1B]/80 border border-[#EEF8CD]/30 hover:border-[#BBF1D2] active:scale-95 transition-all duration-200 rounded-lg backdrop-blur-sm cursor-pointer"
          >
            See how it works
          </button>
        </div>
      </div>

      {/* Collapsible 3D Scene Controls Dock at Bottom Center (Three.js Skill standard) */}
      <div className="pointer-events-auto self-center mt-auto">
        <div className="flex flex-col items-center">
          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              setHudCollapsed(!hudCollapsed);
            }}
            className="mb-1.5 px-3 py-1 bg-[#191E1B]/80 text-[#EEF8CD]/70 hover:text-[#FFC5AA] text-[11px] font-poppins rounded-t-md border-t border-x border-[#FFC5AA]/20 backdrop-blur-sm cursor-pointer transition-colors"
          >
            {hudCollapsed ? '▴ Show 3D scene guide' : '▾ Hide guide'}
          </button>

          {/* Unified Dock */}
          {!hudCollapsed && (
            <div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-2.5 bg-[#191E1B]/85 border border-[#FFC5AA]/30 rounded-xl shadow-2xl backdrop-blur-md text-xs font-poppins text-[#EEF8CD]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#BBF1D2]" />
                <span className="text-[#FFC5AA] font-medium hidden sm:inline">3D INTERACTIVE KIRANA:</span>
                <span className="text-[#EEF8CD]/85">Move cursor to navigate depth</span>
              </div>

              <div className="h-4 w-[1px] bg-[#EEF8CD]/20 hidden sm:block" />

              <div className="flex items-center gap-2 text-[#EEF8CD]/75">
                <span className="text-[#FF9D9D] font-mono text-sm">✦</span>
                <span>Click counter items to inspect</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
