import React, { useState } from 'react';
import { Mic, FileText, Search, MessageSquare, CheckCircle } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface Stage {
  number: string;
  title: string;
  subtitleHindi: string;
  description: string;
  detail: string;
  icon: React.ReactNode;
  accentColor: string;
}

const stages: Stage[] = [
  {
    number: '01',
    title: 'Listen',
    subtitleHindi: 'आवाज सुनना',
    description: 'Capture the spoken order directly from neighborhood conversation.',
    detail: 'Acoustic audio stream recorded at the grocery counter while ambient bazaar noise and chatter are filtered.',
    icon: <Mic className="w-6 h-6" />,
    accentColor: '#FF9D9D', // Coral
  },
  {
    number: '02',
    title: 'Transcribe',
    subtitleHindi: 'ध्वनि से पाठ',
    description: 'Convert speech into text when speech recognition is available.',
    detail: 'Natural Hindi, Hinglish, and regional vernacular transcribed into phonetic phrases (e.g. “दो किलो चीनी और एक नमक”).',
    icon: <FileText className="w-6 h-6" />,
    accentColor: '#FFC5AA', // Peach
  },
  {
    number: '03',
    title: 'Check',
    subtitleHindi: 'सख्त जांच',
    description: 'Inspect the product name, quantity, and unit for unclear details.',
    detail: 'Deterministic parser checks each entity against kirana grocery taxonomy: Is product specific? Is quantity numeric? Is unit (kg, g, L, packet) present?',
    icon: <Search className="w-6 h-6" />,
    accentColor: '#EEF8CD', // Pale Lime
  },
  {
    number: '04',
    title: 'Clarify',
    subtitleHindi: 'स्पष्टीकरण प्रश्न',
    description: 'Ask a targeted question when information is missing or ambiguous.',
    detail: 'Never make silent assumptions. When unit is missing, trigger an instant targeted query: “नमक कितना चाहिए? 500 ग्राम या 1 किलो?”',
    icon: <MessageSquare className="w-6 h-6" />,
    accentColor: '#FF9D9D', // Coral
  },
  {
    number: '05',
    title: 'Confirm',
    subtitleHindi: 'अंतिम पुष्टि',
    description: 'Finalize the order only after explicit confirmation.',
    detail: 'Order is locked into ledger and weighing scale only after deliberate shopkeeper or customer confirmation—zero guessing.',
    icon: <CheckCircle className="w-6 h-6" />,
    accentColor: '#BBF1D2', // Mint Green
  },
];

export const HowItWorksSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0);

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-[#191E1B] text-[#EEF8CD] overflow-hidden scroll-mt-20">
      {/* Background ambient gradient glow using brand palette */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-[#FF9D9D]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-[#BBF1D2]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-block px-3 py-1 bg-[#EEF8CD]/10 text-[#FFC5AA] font-poppins text-xs font-semibold tracking-wider uppercase rounded-md mb-4 border border-[#FFC5AA]/20">
            03 · THE VERIFICATION PIPELINE
          </div>

          <h2
            className="font-jaro text-4xl sm:text-5xl lg:text-6xl text-[#EEF8CD] tracking-tight leading-[1.05] mb-6"
            style={{ textWrap: 'balance' }}
          >
            How BOLPROOF Works
          </h2>

          <p className="font-poppins text-base sm:text-lg text-[#EEF8CD]/80 leading-relaxed">
            Five connected stages engineered to eliminate grocery miscommunication without slowing down the fast rhythm of Indian neighborhood retail.
          </p>
        </div>

        {/* Connected Stages Timeline */}
        <div className="relative">
          {/* Connecting line across desktop view */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-1 bg-gradient-to-r from-[#FF9D9D] via-[#FFC5AA] via-[#EEF8CD] via-[#FF9D9D] to-[#BBF1D2] opacity-30 z-0" />

          {/* 5 Connected Stages Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {stages.map((st, index) => {
              const isSelected = activeStage === index;
              return (
                <div
                  key={st.number}
                  onClick={() => {
                    sounds.playClick();
                    setActiveStage(index);
                  }}
                  className={`group p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#222623] border-[#FFC5AA] shadow-xl ring-1 ring-[#FFC5AA]/50 scale-[1.02]'
                      : 'bg-[#191E1B]/70 border-[#EEF8CD]/15 hover:border-[#EEF8CD]/30 hover:bg-[#222623]/50'
                  }`}
                >
                  <div>
                    {/* Header: Stage Number & Icon */}
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-jaro text-3xl tracking-wide text-[#FFC5AA]">
                        {st.number}
                      </span>
                      <div
                        className="p-2.5 rounded-xl text-[#191E1B] transition-transform group-hover:scale-110"
                        style={{ backgroundColor: st.accentColor }}
                      >
                        {st.icon}
                      </div>
                    </div>

                    {/* Stage Title */}
                    <h3 className="font-bungee text-lg text-[#EEF8CD] tracking-wide mb-1">
                      {st.title}
                    </h3>

                    {/* Hindi Subtitle */}
                    <p className="font-poppins text-xs font-semibold text-[#FF9D9D] mb-3">
                      {st.subtitleHindi}
                    </p>

                    {/* Description */}
                    <p className="font-poppins text-sm text-[#EEF8CD]/85 leading-snug mb-4">
                      {st.description}
                    </p>
                  </div>

                  {/* Micro Detail */}
                  <div className="pt-3 border-t border-[#EEF8CD]/10 text-[11px] font-poppins text-[#EEF8CD]/60">
                    {st.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical Transparency Note */}
        <div className="mt-12 p-4 bg-[#222623]/80 rounded-xl border border-[#EEF8CD]/10 text-center font-poppins text-xs text-[#EEF8CD]/70 max-w-2xl mx-auto">
          Speech transcription runs when live browser or hardware speech recognition is available; offline shops can use the manual touch clarification interface seamlessly.
        </div>
      </div>
    </section>
  );
};
