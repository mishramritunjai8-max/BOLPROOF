import React, { useState } from 'react';
import { Navigation } from './components/layout/Navigation';
import { KiranaScene } from './components/scene/KiranaScene';
import { HeroOverlay } from './components/hero/HeroOverlay';
import { ProblemSection } from './components/sections/ProblemSection';
import { OrderDemoSection } from './components/sections/OrderDemoSection';
import { HowItWorksSection } from './components/sections/HowItWorksSection';
import { PrinciplesSection } from './components/sections/PrinciplesSection';
import { FinalCTASection } from './components/sections/FinalCTASection';
import { Footer } from './components/layout/Footer';

export default function App() {
  const [selectedQuantity, setSelectedQuantity] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [inspectedItem, setInspectedItem] = useState<string | null>(null);

  const scrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handle3DItemClick = (itemName: string) => {
    setInspectedItem(itemName);
    if (itemName.includes('नमक') || itemName.includes('Salt')) {
      scrollToDemo();
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF8CD] text-[#191E1B] selection:bg-[#FF9D9D] selection:text-[#191E1B]">
      {/* Top Navigation */}
      <Navigation />

      {/* Main Hero: Full-Screen 100svh Three.js Kirana Scene + HTML Overlay */}
      <section id="hero" className="relative w-full h-[100svh] overflow-hidden">
        {/* 3D Scene Layer */}
        <KiranaScene
          selectedQuantity={selectedQuantity}
          isConfirmed={isConfirmed}
          onClickObject={handle3DItemClick}
        />

        {/* HTML/CSS Hero Content Layer */}
        <HeroOverlay
          onExploreDemo={scrollToDemo}
          onSeeHowItWorks={scrollToHowItWorks}
        />
      </section>

      {/* Section 2: The Problem */}
      <ProblemSection />

      {/* Section 3: Interactive Order Verification Demo */}
      <OrderDemoSection
        selectedQuantity={selectedQuantity}
        isConfirmed={isConfirmed}
        onQuantitySelect={(qty) => setSelectedQuantity(qty)}
        onConfirmOrder={(confirmed) => setIsConfirmed(confirmed)}
        onResetOrder={() => {
          setSelectedQuantity(null);
          setIsConfirmed(false);
        }}
      />

      {/* Section 4: How BOLPROOF Works */}
      <HowItWorksSection />

      {/* Section 5: Product Principles */}
      <PrinciplesSection />

      {/* Section 6: Final Call to Action */}
      <FinalCTASection onExploreDemo={scrollToDemo} />

      {/* Footer */}
      <Footer />

      {/* Toast banner when a 3D counter item is clicked */}
      {inspectedItem && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 bg-[#191E1B]/95 text-[#EEF8CD] rounded-xl border border-[#FFC5AA]/40 shadow-2xl flex items-center justify-between gap-3 font-poppins text-xs animate-in fade-in duration-200">
          <div>
            <span className="text-[#FF9D9D] font-bold block mb-0.5">3D KIRANA COUNTER:</span>
            <span>{inspectedItem}</span>
          </div>
          <button
            onClick={() => setInspectedItem(null)}
            className="p-1 text-[#EEF8CD]/60 hover:text-[#EEF8CD] text-base leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
