import React from 'react';
import { Target, CheckCircle, HelpCircle, FileCheck } from 'lucide-react';

const principles = [
  {
    icon: <Target className="w-6 h-6 text-[#191E1B]" />,
    bg: '#FF9D9D', // Coral
    title: 'Check product names, quantities, and units.',
    hindi: 'उत्पाद का नाम, संख्या और इकाई की बारीकी से जांच',
    description:
      'A spoken word is incomplete without its measurement. Hearing "एक नमक" requires checking whether "एक" refers to a 100g sachet, a 1kg household pouch, or a 25kg wholesale sack.',
  },
  {
    icon: <HelpCircle className="w-6 h-6 text-[#191E1B]" />,
    bg: '#FFC5AA', // Peach
    title: 'Ask a specific question instead of guessing.',
    hindi: 'अंदाजा लगाने के बजाय स्पष्ट सवाल पूछना',
    description:
      'Kirana shopkeepers often guess to avoid holding up the line. BOLPROOF replaces silent assumptions with a targeted 3-option inquiry that takes less than two seconds to answer.',
  },
  {
    icon: <FileCheck className="w-6 h-6 text-[#191E1B]" />,
    bg: '#EEF8CD', // Pale Lime
    title: 'Show the corrected order clearly.',
    hindi: 'सुधरे हुए ऑर्डर को साफ-साफ प्रदर्शित करना',
    description:
      'Both the customer and shopkeeper see real-time draft status on screen or hear it read aloud. Ambiguous items turn from caution coral to verified neutral before the bag is packed.',
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-[#191E1B]" />,
    bg: '#BBF1D2', // Mint Green
    title: 'Require explicit confirmation before finalization.',
    hindi: 'अंतिम बिल से पहले स्पष्ट सहमति अनिवार्य',
    description:
      'No order is automatically finalized on speech detection alone. An explicit tap or spoken agreement ("हाँ, पक्का") is mandatory before sending items to the billing register.',
  },
];

export const PrinciplesSection: React.FC = () => {
  return (
    <section id="principles" className="relative py-24 sm:py-32 bg-[#EEF8CD] text-[#191E1B] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-block px-3 py-1 bg-[#BBF1D2] text-[#191E1B] font-poppins text-xs font-semibold tracking-wider uppercase rounded-md mb-4">
            04 · PRODUCT PHILOSOPHY
          </div>

          <h2
            className="font-jaro text-4xl sm:text-5xl lg:text-6xl text-[#191E1B] tracking-tight leading-[1.05] mb-6"
            style={{ textWrap: 'balance' }}
          >
            Understanding the words is only the beginning.
          </h2>

          <p className="font-poppins text-base sm:text-lg text-[#49544E] leading-relaxed">
            Speech-to-text algorithms can accurately transcribe acoustic sounds, but transcription is not understanding. 
            BOLPROOF bridges the gap between everyday Indian colloquial speech and error-free grocery fulfillment.
          </p>
        </div>

        {/* 4 Core Principles in an Airy Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {principles.map((pr, idx) => (
            <div
              key={idx}
              className="p-8 bg-[#FFFFFF] rounded-2xl border border-[#191E1B]/10 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Icon badge */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm"
                  style={{ backgroundColor: pr.bg }}
                >
                  {pr.icon}
                </div>

                {/* Title */}
                <h3 className="font-poppins font-bold text-xl sm:text-2xl text-[#191E1B] mb-2 leading-snug">
                  {pr.title}
                </h3>

                {/* Hindi translation */}
                <p className="font-poppins text-xs font-semibold text-[#8B2624] mb-4">
                  {pr.hindi}
                </p>

                {/* Description */}
                <p className="font-poppins text-sm text-[#49544E] leading-relaxed">
                  {pr.description}
                </p>
              </div>

              {/* Number indicator */}
              <div className="mt-8 pt-4 border-t border-[#191E1B]/10 flex items-center justify-between text-xs font-poppins text-[#707C75]">
                <span>Principle 0{idx + 1}</span>
                <span className="font-mono text-xs">BOLPROOF RULE</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
