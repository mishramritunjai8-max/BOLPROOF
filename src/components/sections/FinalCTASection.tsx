import React from 'react';
import { sounds } from '../../utils/sound';

interface FinalCTASectionProps {
  onExploreDemo: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onExploreDemo }) => {
  const handleClick = () => {
    sounds.playClick();
    onExploreDemo();
  };

  return (
    <section className="relative py-24 sm:py-32 bg-[#191E1B] text-[#EEF8CD] overflow-hidden">
      {/* Decorative Warm Kirana Glow & Ambient Shapes */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#191E1B] via-[#222623] to-[#191E1B]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#FF9D9D]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Short decorative kicker */}
        <div className="inline-block px-3 py-1 bg-[#BBF1D2]/20 text-[#BBF1D2] font-poppins text-xs font-semibold tracking-wider uppercase rounded-md mb-6 border border-[#BBF1D2]/30">
          CLEAR ORDERS · ZERO GUESSWORK
        </div>

        {/* Main Heading in Jaro */}
        <h2
          className="font-jaro text-5xl sm:text-6xl lg:text-7xl text-[#EEF8CD] tracking-tight leading-[1.0] mb-6"
          style={{ textWrap: 'balance' }}
        >
          Make every spoken order clearer.
        </h2>

        {/* Supporting text in Poppins */}
        <p className="font-poppins text-lg sm:text-2xl text-[#FFC5AA] font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
          Catch unclear details before they become order mistakes.
        </p>

        {/* Call to action button in Coral/Peach */}
        <button
          onClick={handleClick}
          className="px-8 py-4 text-base sm:text-lg font-poppins font-bold text-[#191E1B] bg-[#FF9D9D] hover:bg-[#FFC5AA] active:scale-95 transition-all duration-200 rounded-xl shadow-2xl hover:shadow-coral-500/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF9D9D]"
        >
          Explore the demo
        </button>

        {/* Hindi tagline */}
        <p className="mt-8 font-poppins text-xs text-[#EEF8CD]/60 tracking-wide">
          किराना दुकानों के लिए विशेष रूप से डिज़ाइन किया गया सत्यापन
        </p>
      </div>
    </section>
  );
};
