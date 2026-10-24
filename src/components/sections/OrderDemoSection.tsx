import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
  Volume2,
  Mic,
  Square,
  Loader2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { AudioRecordingService } from '../../utils/audioRecorder';
import { parseOrderText, ParseResult } from '../../utils/orderParser';
import { transcribeAudio, synthesizeSpeech } from '../../utils/apiClient';

interface OrderDemoSectionProps {
  selectedQuantity?: string | null;
  isConfirmed?: boolean;
  onQuantitySelect?: (qty: string | null) => void;
  onConfirmOrder?: (confirmed: boolean) => void;
  onResetOrder?: () => void;
}

const DEFAULT_DEMO_SAMPLE = 'भैया, दो किलो चीनी और एक नमक दे देना।';
const DEMO_SALT_OPTIONS = ['500 g', '1 kg', '2 kg'] as const;

export const OrderDemoSection: React.FC<OrderDemoSectionProps> = ({
  onQuantitySelect,
  onConfirmOrder,
  onResetOrder,
}) => {
  // =========================================================================
  // LEFT COLUMN: REAL VOICE ORDERING INTERFACE (Gnani Prisma STT & Timbre TTS)
  // =========================================================================
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceIsRecording, setVoiceIsRecording] = useState<boolean>(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState<number>(0);
  const [voiceIsTranscribing, setVoiceIsTranscribing] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Voice order verification flow state
  const [voiceOrderProcessed, setVoiceOrderProcessed] = useState<boolean>(false);
  const [voiceParsedResult, setVoiceParsedResult] = useState<ParseResult | null>(null);
  // Dictionary of resolved quantities per item id: e.g. { sugar: '500 g', salt: '1 kg', oil: '1 L' }
  const [voiceResolvedQuantities, setVoiceResolvedQuantities] = useState<Record<string, string>>({});
  const [voiceIsConfirmed, setVoiceIsConfirmed] = useState<boolean>(false);

  // Timbre TTS state for individual items
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [voiceTtsError, setVoiceTtsError] = useState<string | null>(null);

  // References for voice audio
  const recorderServiceRef = useRef<AudioRecordingService | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // =========================================================================
  // RIGHT COLUMN: EXISTING INDEPENDENT INTERACTIVE DEMO (Sugar & Salt)
  // =========================================================================
  const [demoSelectedQuantity, setDemoSelectedQuantity] = useState<string | null>(null);
  const [demoIsConfirmed, setDemoIsConfirmed] = useState<boolean>(false);
  const [demoTtsError, setDemoTtsError] = useState<string | null>(null);
  const [demoIsSpeakingTTS, setDemoIsSpeakingTTS] = useState<boolean>(false);
  const [demoIsPlayingAudio, setDemoIsPlayingAudio] = useState<boolean>(false);
  const demoAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up timers and audio players on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recorderServiceRef.current) recorderServiceRef.current.cancel();
      if (voiceAudioPlayerRef.current) {
        voiceAudioPlayerRef.current.pause();
        voiceAudioPlayerRef.current = null;
      }
      if (demoAudioPlayerRef.current) {
        demoAudioPlayerRef.current.pause();
        demoAudioPlayerRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Helper: Synthesize & Play Timbre TTS audio for clarification questions
  // -------------------------------------------------------------------------
  const playTimbreTTS = async (
    textToSpeak: string,
    itemId: string,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    playerRef: React.MutableRefObject<HTMLAudioElement | null>
  ) => {
    setError(null);

    // Stop current playback if active
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current = null;
      setPlayingItemId(null);
      setDemoIsPlayingAudio(false);
      return;
    }

    if (itemId === 'demo') {
      setDemoIsSpeakingTTS(true);
    } else {
      setSpeakingItemId(itemId);
    }

    try {
      const audioBlob = await synthesizeSpeech(textToSpeak, 'Nalini', 'timbre-v2.5', 'hi-IN');
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      playerRef.current = audio;

      audio.onplay = () => {
        if (itemId === 'demo') {
          setDemoIsPlayingAudio(true);
          setDemoIsSpeakingTTS(false);
        } else {
          setPlayingItemId(itemId);
          setSpeakingItemId(null);
        }
      };

      audio.onended = () => {
        if (itemId === 'demo') {
          setDemoIsPlayingAudio(false);
        } else {
          setPlayingItemId(null);
        }
        playerRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        if (itemId === 'demo') {
          setDemoIsPlayingAudio(false);
        } else {
          setPlayingItemId(null);
        }
        playerRef.current = null;
        setError('Audio playback failed in this browser.');
      };

      await audio.play();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to play spoken question via Gnani Timbre.');
      if (itemId === 'demo') {
        setDemoIsPlayingAudio(false);
        setDemoIsSpeakingTTS(false);
      } else {
        setPlayingItemId(null);
        setSpeakingItemId(null);
      }
    }
  };

  // =========================================================================
  // VOICE ORDER HANDLERS (Left Column)
  // =========================================================================
  const startVoiceRecording = async () => {
    setVoiceError(null);
    setVoiceOrderProcessed(false);
    setVoiceParsedResult(null);
    setVoiceResolvedQuantities({});
    setVoiceIsConfirmed(false);

    try {
      if (!recorderServiceRef.current) {
        recorderServiceRef.current = new AudioRecordingService();
      }

      await recorderServiceRef.current.start();
      sounds.playClick();
      setVoiceIsRecording(true);
      setVoiceRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setVoiceRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopVoiceRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setVoiceIsRecording(false);
      setVoiceError(error.message || 'Could not start microphone recording.');
    }
  };

  const stopVoiceRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!recorderServiceRef.current) return;

    setVoiceIsRecording(false);
    setVoiceIsTranscribing(true);
    setVoiceError(null);

    try {
      // Convert to 16kHz linear PCM WAV
      const result = await recorderServiceRef.current.stop();

      // Submit to backend Gnani Prisma STT proxy with safe response parsing
      const data = await transcribeAudio(result.wavBlob, 'hi-IN');

      if (data.transcript && data.transcript.trim().length > 0) {
        sounds.playConfirm();
        const recognized = data.transcript.trim();
        setVoiceTranscript(recognized);
      } else {
        setVoiceError('No speech detected in recording. Please try speaking clearly into the microphone.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setVoiceError(error.message || 'Prisma STT transcription failed. Please retry.');
    } finally {
      setVoiceIsTranscribing(false);
    }
  };

  // Confirm Order handler for the Voice Ordering interface
  // Uses the currently displayed transcript (including user edits)
  const handleVoiceConfirmOrder = () => {
    sounds.playClick();
    setVoiceError(null);

    if (!voiceTranscript.trim()) {
      setVoiceError('Please record your order or enter a transcript before confirming.');
      return;
    }

    // Process transcript deterministically without cross-item leakage
    const parsed = parseOrderText(voiceTranscript);
    setVoiceParsedResult(parsed);
    setVoiceOrderProcessed(true);
    setVoiceResolvedQuantities({});
    setVoiceIsConfirmed(false);
  };

  // Finalize confirmed voice order
  const handleVoiceFinalizeOrder = () => {
    sounds.playConfirm();
    setVoiceIsConfirmed(true);
    onConfirmOrder?.(true);
  };

  // Reset voice order panel
  const handleResetVoiceOrder = () => {
    sounds.playClick();
    setVoiceTranscript('');
    setVoiceOrderProcessed(false);
    setVoiceParsedResult(null);
    setVoiceResolvedQuantities({});
    setVoiceIsConfirmed(false);
    setVoiceError(null);
    setVoiceTtsError(null);
    if (voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
      voiceAudioPlayerRef.current = null;
      setPlayingItemId(null);
    }
  };

  // =========================================================================
  // DEMO ORDER HANDLERS (Right Column)
  // =========================================================================
  const handleDemoSelectOption = (opt: string) => {
    sounds.playSelect();
    setDemoSelectedQuantity(opt);
    setDemoIsConfirmed(false);
    onQuantitySelect?.(opt);
    onConfirmOrder?.(false);
  };

  const handleDemoConfirm = () => {
    if (!demoSelectedQuantity) return;
    sounds.playConfirm();
    setDemoIsConfirmed(true);
    onConfirmOrder?.(true);
  };

  const handleDemoReset = () => {
    sounds.playClick();
    setDemoSelectedQuantity(null);
    setDemoIsConfirmed(false);
    setDemoTtsError(null);
    onQuantitySelect?.(null);
    onConfirmOrder?.(false);
    onResetOrder?.();

    if (demoAudioPlayerRef.current) {
      demoAudioPlayerRef.current.pause();
      demoAudioPlayerRef.current = null;
      setDemoIsPlayingAudio(false);
    }
  };

  // Check if every item in voiceParsedResult has been verified/resolved
  const allVoiceItemsResolved =
    voiceParsedResult &&
    voiceParsedResult.items.every(
      (item) => !item.isUnclear || Boolean(voiceResolvedQuantities[item.id])
    );

  return (
    <section id="demo" className="relative py-24 sm:py-32 bg-[#FFFFFF] text-[#191E1B] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 bg-[#BBF1D2]/60 text-[#191E1B] font-poppins text-xs font-semibold tracking-wider uppercase rounded-md mb-4">
            02 · VOICE ORDERING & DEMO CONSOLE
          </div>

          <h2
            className="font-jaro text-4xl sm:text-5xl lg:text-6xl text-[#191E1B] tracking-tight leading-[1.05] mb-4"
            style={{ textWrap: 'balance' }}
          >
            Voice Order Verification Console
          </h2>

          <p className="font-poppins text-base sm:text-lg text-[#49544E] mb-4">
            Record real voice orders with Gnani Prisma STT on the left, or test the guided neighborhood grocery scenario on the right. Both sections operate independently.
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF8CD] text-[#191E1B] font-poppins text-xs font-medium rounded-full border border-[#FFC5AA]/40">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              Left: Live Prisma STT & Timbre TTS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF8CD] text-[#191E1B] font-poppins text-xs font-medium rounded-full border border-[#FFC5AA]/40">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              Right: Guided Interactive Demo
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TWO-COLUMN SIDE-BY-SIDE DESKTOP LAYOUT (Stacked on Mobile)        */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* =============================================================== */}
          {/* COLUMN 1 (LEFT): REAL VOICE ORDERING INTERFACE                   */}
          {/* =============================================================== */}
          <div className="bg-[#EEF8CD]/30 rounded-3xl border border-[#191E1B]/15 p-6 sm:p-8 shadow-md flex flex-col justify-between h-full">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-[#191E1B]/10 mb-6">
                <span className="font-bungee text-xs tracking-wider text-[#9E2A2B] flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-[#FF9D9D]" />
                  VOICE ORDER · GNANI PRISMA STT
                </span>
                <span className="text-[11px] font-poppins font-semibold px-2 py-0.5 bg-[#FF9D9D]/30 text-[#8B2624] rounded">
                  Live Microphone
                </span>
              </div>

              <h3 className="font-jaro text-2xl sm:text-3xl text-[#191E1B] mb-2">
                Live Voice Order
              </h3>
              <p className="font-poppins text-xs sm:text-sm text-[#49544E] mb-6">
                Record your grocery order in Hindi. Review and edit the recognized transcript, then click Confirm Order to verify quantities.
              </p>

              {/* Error Notice */}
              {voiceError && (
                <div className="mb-5 p-3.5 bg-[#FF9D9D]/30 border-2 border-[#FF9D9D] rounded-xl flex items-start justify-between gap-3 font-poppins text-xs text-[#8B2624] animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#8B2624] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Voice Input Notice:</strong>
                      <span>{voiceError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceError(null)}
                    className="text-sm font-bold text-[#8B2624] hover:text-[#191E1B] p-0.5"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Recording Action Card */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#191E1B]/10 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {voiceIsRecording ? (
                      <div className="w-11 h-11 rounded-full bg-[#FF9D9D] flex items-center justify-center animate-pulse shrink-0">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#8B2624]" />
                      </div>
                    ) : voiceIsTranscribing ? (
                      <div className="w-11 h-11 rounded-full bg-[#FFC5AA] flex items-center justify-center shrink-0">
                        <Loader2 className="w-5 h-5 text-[#191E1B] animate-spin" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#EEF8CD] border border-[#FFC5AA] flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5 text-[#191E1B]" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-poppins font-semibold text-sm text-[#191E1B]">
                        {voiceIsRecording
                          ? `Recording (${String(voiceRecordingSeconds).padStart(2, '0')}s / 30s)`
                          : voiceIsTranscribing
                          ? 'Transcribing with Prisma STT...'
                          : 'Microphone Audio Input'}
                      </h4>
                      <p className="font-poppins text-xs text-[#707C75]">
                        {voiceIsRecording
                          ? 'Speak now (e.g. “आधा चीनी एक नमक 3 सरसों तेल”)'
                          : voiceIsTranscribing
                          ? 'Encoding 16kHz PCM WAV & calling Gnani API...'
                          : 'Press button to speak Hindi/Hinglish order'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {voiceIsRecording ? (
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF9D9D] hover:bg-[#8B2624] text-[#191E1B] hover:text-white text-xs font-poppins font-bold rounded-xl shadow transition-all cursor-pointer animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        Stop Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={voiceIsTranscribing}
                        onClick={startVoiceRecording}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#191E1B] hover:bg-[#FF9D9D] text-[#EEF8CD] hover:text-[#191E1B] text-xs font-poppins font-bold rounded-xl shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {voiceIsTranscribing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-[#BBF1D2]" />
                            Record Voice
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript Display & Editable Field */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#191E1B]/10 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="voice-order-transcript-input"
                    className="text-xs font-poppins font-semibold uppercase tracking-wider text-[#49544E]"
                  >
                    Recognized Transcript (संपादित करें / Edit if needed):
                  </label>
                  <button
                    type="button"
                    onClick={() => setVoiceTranscript('आधा चीनी एक नमक 3 सरसों तेल ऑर्डर करना है')}
                    className="text-[11px] font-poppins font-medium text-[#707C75] hover:text-[#191E1B] underline cursor-pointer"
                    title="Paste multi-item test order"
                  >
                    Paste bug test transcript
                  </button>
                </div>

                <textarea
                  id="voice-order-transcript-input"
                  value={voiceTranscript}
                  onChange={(e) => {
                    setVoiceTranscript(e.target.value);
                    setVoiceOrderProcessed(false);
                    setVoiceIsConfirmed(false);
                  }}
                  rows={3}
                  className="w-full p-3 bg-[#F9FAF8] border border-[#191E1B]/15 rounded-xl font-poppins text-base text-[#191E1B] focus:outline-none focus:ring-2 focus:ring-[#FF9D9D] transition-all resize-y"
                  placeholder="Your transcribed voice order will appear here. You can also edit recognition errors directly before confirming..."
                />
                <p className="mt-1 text-[11px] font-poppins text-[#707C75]">
                  Speech recognition is not proof of accuracy. Review and correct words above if needed.
                </p>
              </div>

              {/* PROMINENT CONFIRM ORDER BUTTON DIRECTLY BELOW TRANSCRIPT */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleVoiceConfirmOrder}
                  className="w-full py-4 px-6 text-sm sm:text-base font-poppins font-bold rounded-2xl bg-[#FF9D9D] hover:bg-[#FFC5AA] text-[#191E1B] shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] border border-[#191E1B]/10 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5 text-[#191E1B]" />
                  <span>Confirm Order (ऑर्डर पुष्टि एवं जांच)</span>
                </button>
              </div>

              {/* POST-CONFIRMATION ORDER VERIFICATION FLOW */}
              {voiceOrderProcessed && voiceParsedResult && (
                <div className="p-5 bg-white rounded-2xl border-2 border-[#191E1B]/15 shadow-sm mb-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#191E1B]/10 mb-4">
                    <span className="font-bungee text-xs text-[#49544E]">
                      VOICE DRAFT ORDER (कच्ची पर्ची)
                    </span>
                    <span className="text-xs font-poppins font-semibold">
                      {voiceIsConfirmed ? (
                        <span className="text-[#065F46]">Order Confirmed ✓</span>
                      ) : allVoiceItemsResolved ? (
                        <span className="text-[#065F46]">All Items Verified — Ready to Finalize</span>
                      ) : (
                        <span className="text-[#B91C1C]">Clarification Required ⚠️</span>
                      )}
                    </span>
                  </div>

                  {/* Item Rows */}
                  <div className="space-y-2.5 mb-5 font-poppins">
                    {voiceParsedResult.items.map((item) => {
                      const resolvedQty = voiceResolvedQuantities[item.id] || item.quantity;
                      const isUnclear = item.isUnclear && !voiceResolvedQuantities[item.id];

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            voiceIsConfirmed
                              ? 'bg-[#BBF1D2]/30 border-[#059669]'
                              : isUnclear
                              ? 'bg-[#FF9D9D]/20 border-[#FF9D9D]'
                              : 'bg-[#F9FAF8] border-[#191E1B]/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {voiceIsConfirmed ? (
                              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                            ) : isUnclear ? (
                              <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                            )}
                            <span className="font-semibold text-sm text-[#191E1B]">
                              {item.name} — {resolvedQty || 'मात्रा स्पष्ट नहीं है'}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                              voiceIsConfirmed
                                ? 'bg-[#BBF1D2] text-[#065F46]'
                                : isUnclear
                                ? 'bg-[#FF9D9D] text-[#9E2A2B]'
                                : 'bg-[#BBF1D2] text-[#065F46]'
                            }`}
                          >
                            {voiceIsConfirmed
                              ? 'Confirmed ✓'
                              : isUnclear
                              ? 'Unclear ⚠️'
                              : 'Verified ✓'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* MULTIPLE CLARIFICATION CONTROLS (SEPARATE FOR EACH AMBIGUOUS PRODUCT) */}
                  {voiceParsedResult.needsClarification && !voiceIsConfirmed && (
                    <div className="space-y-4 mb-5">
                      <div className="pb-1 border-b border-[#191E1B]/10 flex items-center justify-between">
                        <span className="font-bungee text-[11px] text-[#9E2A2B] uppercase">
                          TARGETED CLARIFICATION REQUIRED (स्पष्टीकरण सवाल)
                        </span>
                        <span className="text-[11px] font-poppins text-[#707C75]">
                          Resolving one product does not resolve others
                        </span>
                      </div>

                      {voiceParsedResult.unclearItems.map((item) => {
                        const isThisItemResolved = Boolean(voiceResolvedQuantities[item.id]);
                        const currentChoice = voiceResolvedQuantities[item.id];

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isThisItemResolved
                                ? 'bg-[#BBF1D2]/25 border-[#059669]/40'
                                : 'bg-[#EEF8CD]/40 border-[#FFC5AA]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bungee text-[#FF9D9D] uppercase block">
                                    {item.name}
                                  </span>
                                  {isThisItemResolved && (
                                    <span className="text-[11px] font-poppins font-semibold text-[#065F46] bg-[#BBF1D2] px-2 py-0.5 rounded">
                                      Resolved: {currentChoice} ✓
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-poppins font-bold text-base sm:text-lg text-[#191E1B]">
                                  “{item.clarificationQuestion}”
                                </h5>
                              </div>

                              {/* Timbre TTS Speak Button for this specific item */}
                              <button
                                type="button"
                                disabled={speakingItemId === item.id}
                                onClick={() =>
                                  playTimbreTTS(
                                    item.clarificationQuestion,
                                    item.id,
                                    setVoiceTtsError,
                                    voiceAudioPlayerRef
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#EEF8CD] text-[#191E1B] text-xs font-poppins font-semibold rounded-lg border border-[#FFC5AA] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                              >
                                {speakingItemId === item.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Synthesizing...</span>
                                  </>
                                ) : playingItemId === item.id ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5 text-[#065F46]" />
                                    <span>Playing audio...</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-[#191E1B]" />
                                    <span>Listen (Timbre TTS)</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Options for this specific item (e.g. 500g, 1kg, 2kg or 500ml, 1L, 2L, 5L) */}
                            <div
                              className={`grid gap-2 mb-2 ${
                                item.options.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
                              }`}
                            >
                              {item.options.map((opt) => {
                                const isSelected = currentChoice === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      sounds.playSelect();
                                      setVoiceResolvedQuantities((prev) => ({
                                        ...prev,
                                        [item.id]: opt,
                                      }));
                                    }}
                                    className={`py-2 px-2 text-xs font-poppins font-bold rounded-lg border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#191E1B] text-[#EEF8CD] border-[#191E1B] shadow-sm'
                                        : 'bg-white text-[#191E1B] border-[#FFC5AA] hover:bg-[#FFC5AA]/40'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            <p className="text-[11px] font-poppins text-[#49544E]">
                              {isThisItemResolved
                                ? `Selected: ${currentChoice}. Click another option to change.`
                                : `Select appropriate ${
                                    item.productType === 'liquid' ? 'volume' : 'weight'
                                  } above.`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {voiceTtsError && (
                    <p className="text-xs font-poppins text-[#8B2624] mb-3">
                      {voiceTtsError}
                    </p>
                  )}

                  {/* SUMMARY OF ALL VERIFIED ITEMS WHEN RESOLVED */}
                  {allVoiceItemsResolved && !voiceIsConfirmed && (
                    <div className="p-4 bg-[#BBF1D2]/30 border-2 border-[#059669]/40 rounded-xl mb-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                        <h5 className="font-poppins font-bold text-sm text-[#065F46]">
                          All items clarified & verified:
                        </h5>
                      </div>
                      <ul className="text-xs font-poppins space-y-1 text-[#191E1B] pl-7">
                        {voiceParsedResult.items.map((item) => (
                          <li key={item.id}>
                            • <strong>{item.name}</strong>:{' '}
                            <span className="text-[#065F46] font-semibold">
                              {voiceResolvedQuantities[item.id] || item.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] font-poppins text-[#065F46] mt-2 pt-2 border-t border-[#059669]/20">
                        Zero guesswork. Explicit final confirmation required below:
                      </p>
                    </div>
                  )}

                  {/* Explicit Finalize Button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={voiceIsConfirmed || !allVoiceItemsResolved}
                      onClick={handleVoiceFinalizeOrder}
                      className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-poppins font-bold rounded-xl transition-all ${
                        voiceIsConfirmed
                          ? 'bg-[#BBF1D2] text-[#065F46] border border-[#059669]'
                          : allVoiceItemsResolved
                          ? 'bg-[#191E1B] hover:bg-[#FF9D9D] text-[#EEF8CD] hover:text-[#191E1B] shadow-md cursor-pointer'
                          : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                      }`}
                    >
                      {voiceIsConfirmed ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
                          Order Confirmed.
                        </span>
                      ) : allVoiceItemsResolved ? (
                        <span>Finalize Confirmed Order (अंतिम पुष्टि करें)</span>
                      ) : (
                        <span>Resolve All Items Above to Finalize</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions for Left Column */}
            <div className="pt-4 border-t border-[#191E1B]/10 flex items-center justify-between text-xs font-poppins">
              <span className="text-[#707C75]">Gnani Prisma STT + Timbre TTS</span>
              {(voiceTranscript || voiceOrderProcessed) && (
                <button
                  type="button"
                  onClick={handleResetVoiceOrder}
                  className="inline-flex items-center gap-1 text-[#707C75] hover:text-[#191E1B] font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Voice Order
                </button>
              )}
            </div>
          </div>

          {/* =============================================================== */}
          {/* COLUMN 2 (RIGHT): EXISTING INTERACTIVE DEMO (Independently Usable)*/}
          {/* =============================================================== */}
          <div className="bg-[#EEF8CD]/30 rounded-3xl border border-[#191E1B]/15 p-6 sm:p-8 shadow-md flex flex-col justify-between h-full">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-[#191E1B]/10 mb-6">
                <span className="font-bungee text-xs tracking-wider text-[#065F46] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#059669]" />
                  INTERACTIVE DEMO · GUIDED SCENARIO
                </span>
                <span className="text-[11px] font-poppins font-semibold px-2 py-0.5 bg-[#BBF1D2] text-[#065F46] rounded">
                  Sugar & Salt Preset
                </span>
              </div>

              <h3 className="font-jaro text-2xl sm:text-3xl text-[#191E1B] mb-2">
                Try the Demo Order
              </h3>
              <p className="font-poppins text-xs sm:text-sm text-[#49544E] mb-6">
                Standard kirana grocery scenario demonstrating how BOLPROOF catches missing units in colloquial Hindi orders before the bill.
              </p>

              {/* Demo Step 1: Customer Spoken Quote */}
              <div className="p-5 bg-white rounded-2xl border border-[#191E1B]/10 mb-5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#191E1B]/10 mb-3">
                  <span className="font-bungee text-xs text-[#707C75]">
                    SPOKEN CUSTOMER AUDIO (SAMPLE)
                  </span>
                  <span className="text-[11px] font-poppins font-medium text-[#065F46]">
                    Hindi Audio Input
                  </span>
                </div>

                <p className="font-poppins text-xl sm:text-2xl font-bold text-[#191E1B] mb-1.5 leading-snug">
                  “{DEFAULT_DEMO_SAMPLE}”
                </p>
                <p className="font-poppins text-xs text-[#707C75] mb-2">
                  Literal: “Brother, give two kilos of sugar and one salt.”
                </p>
                <div className="p-2 bg-[#FF9D9D]/15 rounded-lg border border-[#FF9D9D]/30 text-[11px] font-poppins text-[#8B2624]">
                  <strong>Issue:</strong> चीनी has specified weight (2 kg), but “एक नमक” lacks packet size.
                </div>
              </div>

              {/* Demo Step 2: Draft Order Table (कच्ची पर्ची) */}
              <div className="p-5 bg-white rounded-2xl border border-[#191E1B]/10 mb-5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#191E1B]/10 mb-3">
                  <span className="font-bungee text-xs text-[#49544E]">
                    DRAFT ORDER (कच्ची पर्ची)
                  </span>
                  <span className="text-xs font-poppins font-semibold text-[#707C75]">
                    {demoIsConfirmed ? (
                      <strong className="text-[#065F46]">Finalized ✓</strong>
                    ) : demoSelectedQuantity ? (
                      <strong className="text-[#B45309]">Pending Confirmation</strong>
                    ) : (
                      <strong className="text-[#B91C1C]">Needs Clarification ⚠️</strong>
                    )}
                  </span>
                </div>

                <div className="space-y-2.5 font-poppins">
                  {/* Item 1: Sugar (2 kg) */}
                  <div className="flex items-center justify-between p-3 bg-[#F9FAF8] rounded-xl border border-[#191E1B]/10">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <span className="font-semibold text-sm text-[#191E1B]">
                        चीनी — 2 kg
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#BBF1D2] text-[#065F46] text-[11px] font-bold rounded">
                      स्पष्ट ✓ (Clear)
                    </span>
                  </div>

                  {/* Item 2: Salt (Target of Clarification) */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      demoIsConfirmed
                        ? 'bg-[#BBF1D2]/30 border-[#059669]'
                        : demoSelectedQuantity
                        ? 'bg-[#FFC5AA]/30 border-[#FFC5AA]'
                        : 'bg-[#FF9D9D]/20 border-[#FF9D9D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {demoIsConfirmed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                      )}
                      <span className="font-semibold text-sm text-[#191E1B]">
                        {demoSelectedQuantity ? `नमक — ${demoSelectedQuantity}` : 'नमक — मात्रा स्पष्ट नहीं है'}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        demoIsConfirmed
                          ? 'bg-[#BBF1D2] text-[#065F46]'
                          : demoSelectedQuantity
                          ? 'bg-[#FFC5AA] text-[#191E1B]'
                          : 'bg-[#FF9D9D] text-[#9E2A2B]'
                      }`}
                    >
                      {demoIsConfirmed
                        ? 'पुष्टि पूर्ण ✓'
                        : demoSelectedQuantity
                        ? 'चयनित'
                        : 'अस्पष्ट ⚠️'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Demo Step 3: Targeted Clarification & Timbre Audio */}
              <div className="p-5 bg-white rounded-2xl border border-[#191E1B]/10 mb-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bungee text-[#FF9D9D] uppercase block">
                      TARGETED CLARIFICATION
                    </span>
                    <h4 className="font-poppins font-bold text-xl text-[#191E1B]">
                      “नमक कितना चाहिए?”
                    </h4>
                  </div>

                  {/* Timbre TTS Button */}
                  <button
                    type="button"
                    disabled={demoIsSpeakingTTS}
                    onClick={() =>
                      playTimbreTTS(
                        'नमक कितना चाहिए?',
                        'demo',
                        setDemoTtsError,
                        demoAudioPlayerRef
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF8CD] hover:bg-[#FFC5AA] text-[#191E1B] text-xs font-poppins font-semibold rounded-lg border border-[#FFC5AA] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    {demoIsSpeakingTTS ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : demoIsPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-[#065F46]" />
                        <span>Playing audio...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-[#191E1B]" />
                        <span>Listen (Timbre TTS)</span>
                      </>
                    )}
                  </button>
                </div>

                {demoTtsError && (
                  <p className="text-[11px] font-poppins text-[#8B2624] mb-2">
                    {demoTtsError}
                  </p>
                )}

                {/* 3 Clickable Options: 500 g, 1 kg, 2 kg */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {DEMO_SALT_OPTIONS.map((opt) => {
                    const isSelected = demoSelectedQuantity === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDemoSelectOption(opt)}
                        className={`py-3 px-2 text-sm font-poppins font-bold rounded-xl border-2 transition-all cursor-pointer active:scale-95 text-center ${
                          isSelected
                            ? 'bg-[#191E1B] text-[#EEF8CD] border-[#191E1B] shadow-md ring-2 ring-[#FF9D9D]'
                            : 'bg-[#EEF8CD]/60 text-[#191E1B] border-[#FFC5AA] hover:bg-[#FFC5AA]/40'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Confirm Order Button for Demo */}
                <div className="pt-3 border-t border-[#191E1B]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs font-poppins text-[#707C75]">
                    {!demoSelectedQuantity
                      ? 'Select an option above to confirm.'
                      : demoIsConfirmed
                      ? 'Order confirmed. Ready for billing.'
                      : `Selected: ${demoSelectedQuantity}. Confirmation required:`}
                  </span>

                  <button
                    type="button"
                    disabled={!demoSelectedQuantity || demoIsConfirmed}
                    onClick={handleDemoConfirm}
                    className={`w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-poppins font-bold rounded-xl transition-all ${
                      demoIsConfirmed
                        ? 'bg-[#BBF1D2] text-[#065F46] border border-[#059669]'
                        : demoSelectedQuantity
                        ? 'bg-[#FF9D9D] hover:bg-[#FFC5AA] text-[#191E1B] shadow-md cursor-pointer active:scale-95'
                        : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                    }`}
                  >
                    {demoIsConfirmed ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
                        Order Confirmed.
                      </span>
                    ) : (
                      <span>Confirm Order</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmed Banner for Demo */}
              {demoIsConfirmed && (
                <div className="p-4 bg-[#BBF1D2]/40 border-2 border-[#059669] rounded-2xl flex items-center justify-between gap-3 mb-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                    <div>
                      <h5 className="font-poppins font-bold text-sm text-[#065F46]">
                        Order confirmed.
                      </h5>
                      <p className="font-poppins text-xs text-[#065F46]/90">
                        चीनी: 2 kg, नमक: {demoSelectedQuantity} verified.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoReset}
                    className="px-3 py-1 bg-white hover:bg-[#EEF8CD] text-[#191E1B] text-xs font-poppins font-semibold rounded-lg border border-[#059669]/30 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions for Right Column */}
            <div className="pt-4 border-t border-[#191E1B]/10 flex items-center justify-between text-xs font-poppins">
              <span className="text-[#707C75]">Deterministic Order Verification</span>
              {(demoSelectedQuantity || demoIsConfirmed) && (
                <button
                  type="button"
                  onClick={handleDemoReset}
                  className="inline-flex items-center gap-1 text-[#707C75] hover:text-[#191E1B] font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Security Disclaimer at bottom */}
        <div className="text-center font-poppins text-xs text-[#707C75] mt-10">
          <span className="font-semibold text-[#191E1B]">BOLPROOF Security Architecture:</span>{' '}
          All Gnani API calls are routed through the local server. <code>GNANI_API_KEY</code> is never exposed to browser bundles.
        </div>
      </div>
    </section>
  );
};
