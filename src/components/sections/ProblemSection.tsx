import React from 'react';
import { AlertCircle, CheckCircle2, Volume2, HelpCircle } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="relative py-24 sm:py-32 bg-[#EEF8CD] text-[#191E1B] overflow-hidden scroll-mt-20">
      {/* Decorative subtle Indian block-print motif divider */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FF9D9D] via-[#FFC5AA] to-[#BBF1D2]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-block px-3 py-1 bg-[#FFC5AA]/40 text-[#191E1B] font-poppins text-xs font-semibold tracking-wider uppercase rounded-md mb-4">
            01 · THE REALITY OF SPOKEN KIRANA ORDERS
          </div>

          <h2
            className="font-jaro text-4xl sm:text-5xl lg:text-6xl text-[#191E1B] tracking-tight leading-[1.05] mb-6"
            style={{ textWrap: 'balance' }}
          >
            One unclear word can change an entire order.
          </h2>

          <p className="font-poppins text-base sm:text-lg text-[#49544E] leading-relaxed">
            In bustling Indian neighborhood kirana stores, spoken grocery orders happen in fast, colloquial Hindi and Hinglish. 
            Customers casually utter incomplete quantities like <span className="font-medium text-[#191E1B]">“एक नमक”</span> (one salt) 
            or <span className="font-medium text-[#191E1B]">“आधा तेल”</span> (half oil). 
            Without deliberate verification, the shopkeeper is forced to guess—leading to wrong items, wasted trips, and awkward returns.
          </p>
        </div>

        {/* Visual Storytelling: The Spoken Order vs The Draft Order */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: What the Customer Spoke */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 bg-[#FFFFFF] rounded-2xl border border-[#191E1B]/10 shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#191E1B]/10 mb-6">
                <span className="font-bungee text-sm tracking-wide text-[#49544E]">
                  SPOKEN ORDER (बोली गई आवाज)
                </span>
                <span className="flex items-center gap-1.5 text-xs font-poppins font-medium text-[#49544E]">
                  <Volume2 className="w-4 h-4 text-[#FF9D9D]" />
                  Acoustic Audio Input
                </span>
              </div>

              {/* Spoken Quote Bubble */}
              <div className="p-6 bg-[#EEF8CD]/50 rounded-xl border border-[#EEF8CD] mb-6">
                <p className="font-poppins font-semibold text-2xl sm:text-3xl text-[#191E1B] leading-snug mb-3">
                  “भैया, दो किलो चीनी और <span className="text-[#9E2A2B] bg-[#FF9D9D]/50 px-2 py-0.5 rounded">एक नमक</span> दे देना।”
                </p>
                <p className="font-poppins text-xs text-[#707C75]">
                  Literal transcription: “Brother, give two kilos of sugar and one salt.”
                </p>
              </div>

              {/* The Ambiguity Breakdown */}
              <div className="space-y-3 font-poppins text-sm text-[#49544E]">
                <div className="flex items-start gap-3">
                  <span className="text-[#FF9D9D] font-bold text-lg leading-none">?</span>
                  <p>
                    <strong className="text-[#191E1B]">What does “एक नमक” mean?</strong> Is it a 500g pouch, a standard 1kg packet, or a 2kg family pack?
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#FF9D9D] font-bold text-lg leading-none">?</span>
                  <p>
                    <strong className="text-[#191E1B]">Which brand?</strong> Tata Salt, Tata Salt Lite, Aashirvaad, or loose rock salt (सेंधा नमक)?
                  </p>
                </div>
              </div>
            </div>

            {/* Traditional Kirana Friction outcome */}
            <div className="mt-8 pt-4 border-t border-[#191E1B]/10 flex items-center gap-3 text-xs font-poppins text-[#9E2A2B]">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#FF9D9D]" />
              <span>
                <strong>Traditional Guesswork:</strong> Shopkeeper picks 1kg packet. Customer returns 15 minutes later: <em>“I needed the small 500g packet!”</em>
              </span>
            </div>
          </div>

          {/* Right Column: BOLPROOF Deterministic Inspection */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 bg-[#191E1B] text-[#EEF8CD] rounded-2xl shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EEF8CD]/15 mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-bungee text-sm tracking-wide text-[#BBF1D2]">
                    BOLPROOF AUDIT LEDGER
                  </span>
                </div>
                <span className="text-xs font-poppins text-[#FFC5AA]">
                  DETERMINISTIC VERIFICATION
                </span>
              </div>

              {/* Itemized Status Rows */}
              <div className="space-y-4 mb-8">
                {/* Item 1: Clear Item */}
                <div className="p-4 bg-[#222623] rounded-xl border border-[#BBF1D2]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#BBF1D2] shrink-0" />
                    <div>
                      <h4 className="font-poppins font-semibold text-lg text-[#EEF8CD]">
                        चीनी (Sugar)
                      </h4>
                      <p className="font-poppins text-xs text-[#EEF8CD]/70">
                        Product: White Refined Sugar · Quantity: 2 · Unit: Kilogram
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-[#BBF1D2]/20 text-[#BBF1D2] text-xs font-poppins font-medium rounded-md whitespace-nowrap">
                    2 kg · VERIFIED
                  </div>
                </div>

                {/* Item 2: Unresolved Item Highlighted in Coral */}
                <div className="p-4 bg-[#FF9D9D]/15 rounded-xl border-2 border-[#FF9D9D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-[#FF9D9D] shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <h4 className="font-poppins font-semibold text-lg text-[#FF9D9D]">
                        नमक (Salt)
                      </h4>
                      <p className="font-poppins text-xs text-[#EEF8CD]/85">
                        Product: Iodized Salt · Quantity: 1 (Count/Packet) · <strong className="text-[#FF9D9D]">Unit weight missing</strong>
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-[#FF9D9D] text-[#191E1B] text-xs font-poppins font-bold rounded-md whitespace-nowrap self-start sm:self-auto">
                    मात्रा स्पष्ट नहीं है (UNCLEAR)
                  </div>
                </div>
              </div>

              {/* Clarification prompt */}
              <div className="p-5 bg-[#222623] rounded-xl border border-[#FFC5AA]/30">
                <p className="font-poppins text-xs text-[#FFC5AA] font-semibold uppercase tracking-wider mb-2">
                  TARGETED CLARIFICATION ASKED TO CUSTOMER:
                </p>
                <p className="font-poppins font-medium text-xl text-[#EEF8CD] mb-2">
                  “नमक कितना चाहिए? 500 ग्राम या 1 किलो?”
                </p>
                <p className="font-poppins text-xs text-[#EEF8CD]/60">
                  Targeted question resolves the exact unit before printing the bill or grabbing from the high shelf.
                </p>
              </div>
            </div>

            {/* Core Principle Badge */}
            <div className="mt-8 pt-4 border-t border-[#EEF8CD]/15 flex items-center justify-between text-xs font-poppins text-[#EEF8CD]/70">
              <span>Rule #1: Never default to guesswork</span>
              <span className="text-[#BBF1D2] font-medium">100% Bill Accuracy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
