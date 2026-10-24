import React from 'react';
import { sounds } from '../../utils/sound';

export const Footer: React.FC = () => {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    sounds.playClick();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#141815] text-[#EEF8CD] pt-16 pb-12 border-t border-[#EEF8CD]/10 font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#EEF8CD]/10">
          {/* Brand & Concept column */}
          <div className="md:col-span-6 lg:col-span-7">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-nabla text-3xl select-none">BOL</span>
              <span className="font-jaro text-2xl text-[#EEF8CD] tracking-wider uppercase">
                PROOF
              </span>
            </div>

            <p className="text-sm text-[#EEF8CD]/80 leading-relaxed max-w-xl mb-6">
              BOLPROOF is a voice-order verification concept designed for Indian neighborhood kirana grocery stores. 
              It identifies missing or ambiguous quantities and units in everyday spoken orders, asks targeted clarification questions, 
              and ensures explicit confirmation before the order is finalized.
            </p>

            <p className="text-xs text-[#FFC5AA]/70 italic">
              “A voice order should never be a guess.”
            </p>
          </div>

          {/* Quick links column */}
          <div className="md:col-span-3 lg:col-span-2">
            <h4 className="font-bungee text-xs text-[#FFC5AA] tracking-wider mb-4 uppercase">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-[#EEF8CD]/80">
              <li>
                <a
                  href="#hero"
                  onClick={(e) => handleScrollTo(e, '#hero')}
                  className="hover:text-[#FF9D9D] transition-colors"
                >
                  3D Kirana Shop
                </a>
              </li>
              <li>
                <a
                  href="#problem"
                  onClick={(e) => handleScrollTo(e, '#problem')}
                  className="hover:text-[#FF9D9D] transition-colors"
                >
                  The Problem
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  onClick={(e) => handleScrollTo(e, '#demo')}
                  className="hover:text-[#BBF1D2] transition-colors"
                >
                  Interactive Demo
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleScrollTo(e, '#how-it-works')}
                  className="hover:text-[#FFC5AA] transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#principles"
                  onClick={(e) => handleScrollTo(e, '#principles')}
                  className="hover:text-[#EEF8CD] transition-colors"
                >
                  Product Principles
                </a>
              </li>
            </ul>
          </div>

          {/* Brand Palette Spec Column */}
          <div className="md:col-span-3 lg:col-span-3">
            <h4 className="font-bungee text-xs text-[#FFC5AA] tracking-wider mb-4 uppercase">
              Brand Palette
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#FF9D9D] border border-white/20 shrink-0" />
                <span className="text-[#EEF8CD]/90 font-mono">#FF9D9D</span>
                <span className="text-[11px] text-[#EEF8CD]/60">Pastel Coral</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#FFC5AA] border border-white/20 shrink-0" />
                <span className="text-[#EEF8CD]/90 font-mono">#FFC5AA</span>
                <span className="text-[11px] text-[#EEF8CD]/60">Peach</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#EEF8CD] border border-white/20 shrink-0" />
                <span className="text-[#EEF8CD]/90 font-mono">#EEF8CD</span>
                <span className="text-[11px] text-[#EEF8CD]/60">Pale Lime</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#BBF1D2] border border-white/20 shrink-0" />
                <span className="text-[#EEF8CD]/90 font-mono">#BBF1D2</span>
                <span className="text-[11px] text-[#EEF8CD]/60">Mint Green</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EEF8CD]/60">
          <div>
            BOLPROOF · Voice Order Verification for Indian Kiranas
          </div>
          <div className="text-[11px]">
            Devanagari typography in Poppins · Hero display in Jaro
          </div>
        </div>
      </div>
    </footer>
  );
};
