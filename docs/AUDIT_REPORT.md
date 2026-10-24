# BOLPROOF — Repository and Architecture Audit Report

**Date:** October 2026  
**Auditor:** Senior Full-Stack & Application Security Engineer  
**Target Repository:** BOLPROOF (Voice-Order Verification for Indian Kirana Stores)  
**Status:** Audit Completed — Hardening & Remediation Plan Formulated  

---

## 1. Executive Summary

BOLPROOF is a specialized voice-order verification web application designed for Indian neighborhood kirana grocery stores. In noisy, high-throughput retail environments, spoken colloquial orders (in Hindi and Hinglish) frequently contain ambiguous quantities, missing units, and colloquial fractions (e.g. *“आधा चीनी”*, *“एक नमक”*, *“3 सरसों तेल”*). Rather than allowing automated billing to guess quantities or placing blind faith in raw AI transcription, BOLPROOF enforces deterministic parsing, transcript transparency, targeted voice/visual clarification, and explicit user confirmation before order finalization.

### Audit Scope
This audit conducted an end-to-end evaluation of:
1. **Frontend Architecture & Components:** React 19, Vite 8, Three.js 3D Kirana counter, Web Audio API recording/synthesizer pipeline, responsive layout, and Devanagari typography.
2. **Backend Proxy & APIs:** Express 4 HTTP server, Multer multipart handling, Gnani Prisma STT proxy (`/api/voice/transcribe`), and Gnani Timbre TTS proxy (`/api/voice/speak`).
3. **Parsing & Verification Engine:** Regex and semantic boundary segmentation in `src/utils/orderParser.ts`, Hindi fractions, liquid vs. solid unit mappings, and multi-item state resolution.
4. **Environment & Secrets:** Secret isolation, credential handling, `.env.example`, and frontend bundle inspection.
5. **Quality Assurance & Build:** TypeScript type checking (`tsc --noEmit`), automated unit tests, and production compilation (`vite build`).

### Summary of Findings
- **Overall Architecture:** Clean, modular, and purpose-built. The Web Audio linear PCM WAV encoder and procedural Web Audio sound synthesizer are high-quality, zero-dependency implementations.
- **Key Vulnerabilities Identified:** Lack of rate limiting on third-party AI voice proxy endpoints (economic DoS risk), loose `upload.any()` file acceptance in Multer, missing audio buffer magic-byte validation, absent HTTP security headers, and hardcoded CORS origins.
- **Defects Remediated in Prior Step:** Hindi fraction parsing, cross-item quantity leakage, and liquid taxonomy for mustard oil were successfully resolved and backed by 23 passing automated tests.

---

## 2. Project Architecture and Data Flow

### Architecture Overview

```mermaid
flowchart TD
    subgraph Browser ["Frontend (React 19 + Vite + Three.js)"]
        UI["Kirana UI & 3D Scene"]
        Mic["MediaRecorder API"]
        AudioConv["AudioRecordingService\n(16kHz 16-bit Mono PCM WAV)"]
        Review["Transcript Review & Edit UI"]
        Parser["Deterministic Order Parser\n(src/utils/orderParser.ts)"]
        Clarify["Multi-Item Clarification UI"]
        Synth["Web Audio Procedural Sound"]
    end

    subgraph Backend ["Backend Proxy (Node.js + Express 4)"]
        SecHeaders["Security Headers & Rate Limiter"]
        UploadFilter["Multer Audio Validation\n(MIME, Ext, Magic Bytes)"]
        STTEndpoint["POST /api/voice/transcribe"]
        TTSEndpoint["POST /api/voice/speak"]
        HealthEndpoint["GET /api/health"]
        EnvConfig["Server-Side .env\n(GNANI_API_KEY)"]
    end

    subgraph GnaniAI ["Upstream External Services (Gnani AI)"]
        PrismaSTT["Gnani Prisma STT v3\n(api.vachana.ai/stt/v3)"]
        TimbreTTS["Gnani Timbre TTS v2.5\n(api.vachana.ai/api/v1/tts/inference)"]
    end

    Mic -->|Compressed Audio| AudioConv
    AudioConv -->|PCM WAV Blob| STTEndpoint
    STTEndpoint --> SecHeaders --> UploadFilter
    UploadFilter -->|Authenticated with X-API-Key-ID| PrismaSTT
    PrismaSTT -->|Raw JSON Transcript| STTEndpoint
    STTEndpoint -->|JSON Transcript| Review
    Review -->|User Edits & Clicks Confirm| Parser
    Parser -->|Ambiguous Items Identified| Clarify
    Clarify -->|Spoken Clarification Request| TTSEndpoint
    TTSEndpoint --> SecHeaders
    TTSEndpoint -->|Authenticated with X-API-Key-ID| TimbreTTS
    TimbreTTS -->|Binary WAV Audio Stream| Clarify
    Clarify -->|User Selects Quantity| Parser
    Parser -->|All Items Verified| UI
    UI -->|Explicit User Confirmation| ConfirmedOrder["Final Confirmed Order"]
```

### End-to-End Order Lifecycle
1. **Acoustic Capture:** The shopkeeper presses "Record Voice". Audio is captured via browser `MediaRecorder` (WebM/Opus) and transformed on-the-fly via Web Audio `OfflineAudioContext` into standard 16,000 Hz 16-bit linear PCM mono WAV.
2. **Secure Transcription Proxy:** The WAV blob is sent to `/api/voice/transcribe`. The Express server verifies credentials, attaches the secret `X-API-Key-ID`, and streams the payload to Gnani Prisma STT v3.
3. **Transcript Transparency:** The raw recognized text is displayed in an editable textarea. The shopkeeper can correct misheard words.
4. **Deterministic Parsing:** Clicking "Confirm Order" executes `parseOrderText()` locally in the browser:
   - Phrases are partitioned into distinct clauses using conjunctions (`और`, `,`) and quantity word prefixes to guarantee zero cross-item contamination.
   - Hindi fractions (`आधा`, `पाव`, `डेढ़`, `ढाई`) paired with units are resolved to standard metric quantities (`500 g`, `250 g`, `1.5 kg`, `2.5 kg`).
   - Bare numbers/fractions without units are flagged as `isUnclear: true` with `quantity: null`.
   - Liquid items (`सरसों तेल`) are bound to liquid volume options (`500 ml`, `1 L`, `2 L`, `5 L`).
5. **Targeted Clarification:** For every unclear product, an independent clarification card displays a Devanagari question (e.g. *“चीनी कितनी चाहिए?”*). The shopkeeper can click a speaker icon to hear the question synthesized via Gnani Timbre TTS.
6. **Explicit Confirmation:** Selecting an option resolves only that product. The order cannot be finalized until all items are verified. An itemized bill summary is reviewed before the final confirmation click.

---

## 3. Findings Grouped by Severity

### Summary Table

| ID | Severity | Category | Title | Affected File(s) | Status |
|---|---|---|---|---|---|
| **SEC-01** | High | Security / DoS | Lack of Rate Limiting on Voice API Endpoints | `server.ts` | Remediation Planned |
| **SEC-02** | High | Input Validation | Unrestricted `upload.any()` in Multipart Handler | `server.ts` | Remediation Planned |
| **SEC-03** | Medium | Validation | Missing Audio Magic-Byte Buffer Verification | `server.ts` | Remediation Planned |
| **SEC-04** | Medium | Hardening | Missing HTTP Security Headers | `server.ts` | Remediation Planned |
| **SEC-05** | Medium | Configuration | Hardcoded CORS Origin Allowlist | `server.ts` | Remediation Planned |
| **SEC-06** | Medium | Info Disclosure | Unfiltered Server Error Messages in Production | `server.ts` | Remediation Planned |
| **BUG-01** | High | Logic / Parsing | Hindi Fraction & Ambiguous Quantity Defaulting to 2 kg | `src/utils/orderParser.ts` | **FIXED & TESTED** |
| **BUG-02** | High | Logic / UI | Single Shared State for Multiple Product Clarifications | `OrderDemoSection.tsx` | **FIXED & TESTED** |
| **BUG-03** | Medium | Logic / Taxonomy | Missing Liquid Taxonomy for Mustard Oil | `src/utils/orderParser.ts` | **FIXED & TESTED** |
| **CFG-01** | Low | Dependencies | Unused `@google/genai` Package in Dependencies | `package.json`, `.env.example` | Remediation Planned |
| **CFG-02** | Low | Tooling | Vite `__dirname` Deprecation Warning in ESM | `vite.config.ts` | Remediation Planned |
| **CFG-03** | Low | Package Metadata | Generic Package Name (`react-example`) | `package.json` | Remediation Planned |
| **TST-01** | Medium | Testing | Lack of Backend Route Integration Tests | `test/` | Remediation Planned |

---

### Detailed Findings

#### [SEC-01] Lack of Rate Limiting on Voice API Endpoints
- **Severity:** High
- **Location:** `server.ts` (lines 79–193, 200–308)
- **Impact:** Upstream Gnani STT and TTS APIs incur monetary billing per transaction and enforce provider rate limits. Unauthenticated, un-rate-limited endpoints allow any network client or malicious script to flood the server, exhausting API credits or denying service to genuine users.
- **Reproduction:** Rapidly execute repeated `curl -X POST http://localhost:3001/api/voice/speak` requests. Every request is immediately forwarded to `api.vachana.ai`.
- **Recommended Fix:** Implement an in-memory sliding-window / token-bucket rate limiter middleware restricting voice endpoints to a reasonable threshold (e.g., 30 requests/minute per IP) and health checks to 120/minute. Return HTTP 429 (`Too Many Requests`) with `Retry-After`.

#### [SEC-02] Unrestricted `upload.any()` in Multipart Audio Handler
- **Severity:** High
- **Location:** `server.ts` (line 79)
- **Impact:** `upload.any()` instructs Multer to parse every incoming field as a file upload into memory buffers without field name validation. An attacker can submit multiple 15 MB files in a single request, triggering rapid memory exhaustion (OOM crash) on Node.js.
- **Reproduction:** Submit a multipart POST to `/api/voice/transcribe` containing multiple large file fields.
- **Recommended Fix:** Replace `upload.any()` with `upload.single('audio_file')`. Enforce single-file parsing and reject non-matching field submissions.

#### [SEC-03] Missing Audio Buffer Magic-Byte Verification
- **Severity:** Medium
- **Location:** `server.ts` (lines 34–44)
- **Impact:** Multer's `fileFilter` verifies only client-supplied MIME headers and file extensions (`.wav`, `.mp3`, etc.). A client can upload arbitrary non-audio binary data spoofing a `.wav` extension, which is then forwarded upstream, wasting bandwidth and triggering provider errors.
- **Reproduction:** Send a text or binary payload named `test.wav` with `Content-Type: audio/wav`.
- **Recommended Fix:** Inspect the first 12 bytes of the in-memory buffer before forwarding: check for RIFF header (`RIFF....WAVE`), OGG header (`OggS`), MP3 sync frames (`\xFF\xFB` / `ID3`), FLAC (`fLaC`), or WebM (`\x1A\x45\xDF\xA3`).

#### [SEC-04] Missing HTTP Security Headers
- **Severity:** Medium
- **Location:** `server.ts` (top-level middleware)
- **Impact:** The Express server does not set defensive security headers, leaving clients vulnerable to MIME-sniffing, clickjacking if embedded in untrusted iframes, and excessive browser feature access.
- **Recommended Fix:** Add custom middleware setting:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: microphone=(self)`

#### [SEC-05] Hardcoded CORS Origin Allowlist
- **Severity:** Medium
- **Location:** `server.ts` (lines 12–23)
- **Impact:** Allowed origins are fixed to `localhost:3000`, `127.0.0.1:3000`, `localhost:5173`, and `127.0.0.1:5173`. When accessing the application across local LAN devices (e.g. tablet or mobile kirana terminal on `192.168.x.x`) or deploying to a staging URL, requests are blocked by CORS.
- **Recommended Fix:** Support `ALLOWED_ORIGINS` environment variable (comma-separated list), falling back to standard local development URLs.

#### [SEC-06] Unfiltered Server Error Messages in Production
- **Severity:** Medium
- **Location:** `server.ts` (lines 310–317)
- **Impact:** The global error handler sends `error.message` directly in the response payload. In production, unhandled exceptions could leak internal paths, module names, or dependency internals.
- **Recommended Fix:** Return generic error descriptions for unexpected 500 status codes in production environments while logging details securely on the server.

#### [BUG-01] [RESOLVED] Hindi Fraction & Ambiguous Quantity Defaulting to 2 kg
- **Severity:** High (Fixed)
- **Location:** `src/utils/orderParser.ts`
- **Resolution:** Replaced fallback assignment with deterministic clause boundary isolation (`findInterProductBoundary`) and explicit unit detection. Unclear quantities evaluate strictly to `null` and `isUnclear: true`. Verified with 23 unit tests.

#### [BUG-02] [RESOLVED] Single Shared State for Multiple Product Clarifications
- **Severity:** High (Fixed)
- **Location:** `src/components/sections/OrderDemoSection.tsx`
- **Resolution:** Upgraded state from `voiceSelectedQuantity: string | null` to `voiceResolvedQuantities: Record<string, string>`. Each ambiguous item receives its own clarification card, resolution tracking, and TTS audio playback. Verified with manual and build testing.

#### [BUG-03] [RESOLVED] Missing Liquid Taxonomy for Mustard Oil
- **Severity:** Medium (Fixed)
- **Location:** `src/utils/orderParser.ts`
- **Resolution:** Added `mustard_oil` (`सरसों तेल`) to catalog with unit type `liquid` and volume clarification options (`500 ml`, `1 L`, `2 L`, `5 L`).

#### [CFG-01] Unused `@google/genai` Dependency & Gemini Reference in `.env.example`
- **Severity:** Low
- **Location:** `package.json`, `.env.example`, `metadata.json`
- **Impact:** `@google/genai` is listed under `dependencies` in `package.json`, and `.env.example` contains `GEMINI_API_KEY`. Neither is imported or used in the application. This creates confusion for contributors and introduces unnecessary dependency overhead.
- **Recommended Fix:** Clean up `.env.example` to focus strictly on Gnani AI configuration (`GNANI_API_KEY`) and server configuration (`PORT`, `ALLOWED_ORIGINS`). Document that BOLPROOF operates without general LLMs to guarantee determinism.

#### [CFG-02] Vite Native ESM `__dirname` Warning
- **Severity:** Low
- **Location:** `vite.config.ts` (line 11)
- **Impact:** In ESM mode, Vite 8 outputs a deprecation warning: `__dirname (vite.config.ts:11:27). Use import.meta.dirname instead`.
- **Recommended Fix:** Replace `path.resolve(__dirname, '.')` with `path.resolve(import.meta.dirname, '.')` or `fileURLToPath(new URL('.', import.meta.url))`.

#### [CFG-03] Generic Package Name in `package.json`
- **Severity:** Low
- **Location:** `package.json` (line 2)
- **Impact:** The package manifest has `"name": "react-example"`, which is a generic scaffolding placeholder.
- **Recommended Fix:** Rename to `"name": "bolproof"`.

#### [TST-01] Missing Backend API Route Tests
- **Severity:** Medium
- **Location:** `test/`
- **Impact:** Automated testing currently covers only `orderParser.ts`. Backend routes (`/api/health`, `/api/voice/speak`, `/api/voice/transcribe`) lack automated contract and error-handling tests.
- **Recommended Fix:** Add `test/api.test.ts` testing input validation, empty audio rejection, text length enforcement, and health check output.

---

## 4. Known Limitations & Unperformed Checks

1. **Upstream Live Latency & Quota Testing:** Live voice tests against Gnani Prisma STT and Timbre TTS require live credentials and outbound network connectivity. In the sandboxed test environment, network requests to `api.vachana.ai` are isolated; mocked and unit assertions verify client and server behavior.
2. **Third-Party Dependency Audit (`npm audit`):** Running `npm audit` requires direct access to `registry.npmjs.org`. In the offline sandbox, this check could not fetch advisory data. A manual review of the direct dependency tree was conducted instead.
3. **Hardware Microphone Access:** Testing real microphone audio capture requires physical browser hardware input. Software unit tests verify WebM-to-PCM-WAV conversion and buffer encoding.

---

## 5. Next Steps
Proceeding to **PHASE 2 (Application Security Audit & Hardening)**:
- Implement in-memory rate limiting, security headers, CORS configuration, and magic-byte audio validation in `server.ts`.
- Create `docs/SECURITY_AUDIT.md`.
- Ensure zero credential exposure.
