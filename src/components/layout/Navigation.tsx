import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound';

export const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    sounds.playClick();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#191E1B]/90 backdrop-blur-md border-b border-[#FFC5AA]/20 py-3 shadow-lg'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8">
          {/* Brand Wordmark Zone */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, '#hero')}
            className="flex items-center gap-2 group whitespace-nowrap shrink-0 text-decoration-none"
          >
            <span className="font-nabla text-3xl sm:text-4xl tracking-tight select-none">
              BOL
            </span>
            <span className="font-jaro text-2xl sm:text-3xl text-[#EEF8CD] tracking-wider uppercase">
              PROOF
            </span>
            <span className="hidden sm:inline-block text-[11px] font-poppins font-normal text-[#FFC5AA]/70 pl-2 border-l border-[#FFC5AA]/30">
              किराना वॉइस सत्यापन
            </span>
          </a>

          {/* Clean 4-5 Navigation Links (Top Bar Contract: Single Line, Whitespace-Nowrap) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-poppins font-medium text-[#EEF8CD]/85">
            <a
              href="#problem"
              onClick={(e) => handleNavClick(e, '#problem')}
              className="hover:text-[#FF9D9D] transition-colors whitespace-nowrap shrink-0"
            >
              The Problem
            </a>
            <a
              href="#demo"
              onClick={(e) => handleNavClick(e, '#demo')}
              className="hover:text-[#BBF1D2] transition-colors whitespace-nowrap shrink-0"
            >
              Try the Demo
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, '#how-it-works')}
              className="hover:text-[#FFC5AA] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#principles"
              onClick={(e) => handleNavClick(e, '#principles')}
              className="hover:text-[#EEF8CD] transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
          </nav>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#demo"
              onClick={(e) => handleNavClick(e, '#demo')}
              className="inline-flex items-center justify-center px-4 sm:px-5 py-2 text-xs sm:text-sm font-poppins font-semibold text-[#191E1B] bg-[#FF9D9D] hover:bg-[#FFC5AA] active:scale-95 transition-all duration-150 rounded-lg shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF9D9D]"
            >
              Explore the demo
            </a>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => {
                sounds.playClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="md:hidden p-2 text-[#EEF8CD] hover:text-[#FF9D9D] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-[#191E1B]/95 border border-[#FFC5AA]/20 rounded-xl flex flex-col gap-3 font-poppins text-sm text-[#EEF8CD]">
            <a
              href="#problem"
              onClick={(e) => handleNavClick(e, '#problem')}
              className="py-2 hover:text-[#FF9D9D] transition-colors"
            >
              The Problem
            </a>
            <a
              href="#demo"
              onClick={(e) => handleNavClick(e, '#demo')}
              className="py-2 hover:text-[#BBF1D2] transition-colors"
            >
              Try the Demo
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, '#how-it-works')}
              className="py-2 hover:text-[#FFC5AA] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#principles"
              onClick={(e) => handleNavClick(e, '#principles')}
              className="py-2 hover:text-[#EEF8CD] transition-colors"
            >
              About
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
