# BOLPROOF — Application Security Audit and Hardening Report

**Date:** October 2026  
**Security Level:** Application Security Review & Defensive Hardening  
**Auditor:** Application Security & QA Engineering Team  
**Scope:** Full-stack BOLPROOF Application (Frontend, Node.js/Express Backend Proxy, Third-Party AI Integrations)  

---

## 1. Executive Summary

This document details the security posture, vulnerability findings, applied mitigations, privacy guarantees, and residual operational risks of the **BOLPROOF** voice-order verification system.

BOLPROOF is designed as a fast-paced retail counter application for Indian kirana grocery stores. A primary design principle is **zero silent assumptions**: speech recognition is explicitly treated as unverified acoustic input, and no order can ever be confirmed without unambiguous quantities, units, and explicit user verification.

From an application security standpoint:
- **No secrets in client bundles:** `GNANI_API_KEY` is kept exclusively on the Node.js backend.
- **Backend voice proxies hardened:** In-memory rate limiting, audio buffer magic-byte validation, restricted multipart parsing, HTTP security headers, and input sanitization have been implemented.
- **Privacy-first ephemeral design:** Voice recordings are processed in memory and never written to disk or stored in databases.

---

## 2. Scope & Methodology

### In-Scope Assets
1. **Frontend Client Application:** React 19, Vite 8, Web Audio API recording service (`src/utils/audioRecorder.ts`), procedural sound synthesizer (`src/utils/sound.ts`), and Devanagari order verification UI.
2. **Backend Voice Proxy:** Express 4 server (`server.ts`), Multer multipart streaming, proxying to Gnani Prisma STT (`https://api.vachana.ai/stt/v3`) and Gnani Timbre TTS (`https://api.vachana.ai/api/v1/tts/inference`).
3. **Environment & Secrets:** Secret storage, `.env` file exclusions, and build artifact analysis.
4. **Order Verification Engine:** Parsing logic in `src/utils/orderParser.ts`, regex boundaries, Hindi fraction handling, and multi-item clarification state.

### Testing Methodology
- **Static Analysis & Secret Inspection:** Automated code scanning for API keys, tokens, hardcoded credentials, and bundle leakage.
- **Defensive Architecture Review:** Review of data flow, upstream API timeout handling, buffer management, and error sanitization.
- **Automated Defensive Testing:** Unit tests for order parsing and API integration tests for rate limiting, magic bytes, and input validation.

> [!NOTE]
> This review represents defensive application security testing and architectural hardening. It does not replace an external, black-box third-party penetration test or formal regulatory certification.

---

## 3. Findings & Remediations Applied

### 3.1 Secrets and Environment Isolation

| Item | Status | Details |
|---|---|---|
| **Secret Storage** | **SECURE** | `GNANI_API_KEY` is loaded solely in `server.ts` via `process.env`. |
| **Frontend Code Leakage** | **CLEAN** | No `VITE_` private variables exist. Zero secret strings in `src/` or `dist/`. |
| **Git Exclusions** | **VERIFIED** | `.gitignore` contains `.env*` with strict exception only for `!.env.example`. |
| **Placeholder Documentation** | **VERIFIED** | `.env.example` provides safe placeholders (`replace_with_your_key`). |
| **Source Search** | **VERIFIED** | Verified through full regex scanning across all project files; no actual credentials present in tracked files. |

---

### 3.2 Backend API Security & Abuse Prevention

#### SEC-01: Rate Limiting & Resource Protection
- **Vulnerability:** Unauthenticated endpoints `/api/voice/transcribe` and `/api/voice/speak` could be abused to deplete Gnani AI API credits or induce economic denial of service.
- **Fix Applied:** Integrated in-memory sliding-window rate limiting:
  - **Voice Endpoints (`/api/voice/*`):** Maximum **30 requests per minute per IP**. Exceeding requests receive `HTTP 429 Too Many Requests` with `Retry-After` header and JSON error payload.
  - **General Endpoints (`/api/health`):** Maximum **120 requests per minute per IP**.
  - Periodic cleanup timer (5 min interval) with `.unref()` prevents memory accumulation from stale IP entries.

#### SEC-02: Strict Multipart Audio Upload Restriction
- **Vulnerability:** `upload.any()` permitted arbitrary multipart fields and unlimited files in memory.
- **Fix Applied:** Changed to `upload.single('audio_file')` with:
  - Strict **10 MB file size limit** (prevents memory bloat; 10 MB is more than adequate for linear PCM WAV voice clips).
  - Maximum **1 file** and **5 fields** per multipart request.
  - Specific Multer error handling returning `HTTP 413` on `LIMIT_FILE_SIZE` and `HTTP 400` on `LIMIT_UNEXPECTED_FILE`.

#### SEC-03: Buffer Magic-Byte Verification (Defense-in-Depth)
- **Vulnerability:** Standard MIME headers and file extensions can be spoofed by an attacker uploading malicious or non-audio binary data.
- **Fix Applied:** Implemented `validateAudioMagicBytes(buffer)` in `server.ts` verifying binary header signatures before forwarding:
  - **RIFF/WAV:** `RIFF` at byte 0 and `WAVE` at byte 8.
  - **OGG:** `OggS` at byte 0.
  - **FLAC:** `fLaC` at byte 0.
  - **MP3:** `ID3` container or MPEG frame sync `0xFF 0xEx`.
  - **WebM / Matroska:** EBML signature `0x1A 0x45 0xDF 0xA3`.
  - **AAC:** ADTS frame sync `0xFF 0xF0`.
  - Any non-matching payload is rejected immediately with `HTTP 400 INVALID_AUDIO_CONTENT` without touching upstream APIs.

#### SEC-04: HTTP Security Headers
- **Vulnerability:** Absence of defensive HTTP response headers.
- **Fix Applied:** Enforced top-level middleware setting:
  - `X-Content-Type-Options: nosniff` (mitigates MIME-type confusion attacks).
  - `X-Frame-Options: SAMEORIGIN` (prevents malicious clickjacking embeds).
  - `Referrer-Policy: strict-origin-when-cross-origin` (restricts referrer leakage).
  - `Permissions-Policy: microphone=(self)` (constrains hardware access to origin).
  - `X-XSS-Protection: 1; mode=block` (legacy browser XSS filter activation).

#### SEC-05: Configurable CORS Policy
- **Vulnerability:** Hardcoded localhost origins prevented deployment on staging environments, local LAN mobile testing, or reverse proxies.
- **Fix Applied:** Reads `ALLOWED_ORIGINS` from the server environment, merging with default development origins (`localhost:3000`, `127.0.0.1:3000`, etc.), rejecting unlisted browser cross-origins.

#### SEC-06: Text-to-Speech Input Validation & Sanitization
- **Vulnerability:** `/api/voice/speak` accepted arbitrary strings up to 1000 characters without character sanitization.
- **Fix Applied:**
  - Enforced length limit of **500 characters** (tailored for clarification prompts).
  - Stripped unprintable ASCII control characters (`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`).
  - Validated voice model and language strings against strict alphanumeric character sets.

#### SEC-07: Error Sanitization in Production
- **Vulnerability:** Internal stack traces and error messages could leak environment details.
- **Fix Applied:** Configured error middleware to return generic `'Internal server error'` when `NODE_ENV === 'production'`.

---

## 4. Authentication Analysis & Public Demo Context

### Is User Authentication Required for BOLPROOF?
BOLPROOF is structured as a **point-of-sale kirana terminal assistance tool** and **interactive open-source portfolio demonstration**:
- In a real-world kirana store counter, shopkeepers do not log in and out between fast-paced customer utterances; the terminal runs on a trusted hardware kiosk/tablet on the shop counter.
- In a public demonstration environment, requiring user registration or login tokens creates severe friction and would prevent visitors from testing the voice verification flow.

### Residual Risks of Unauthenticated Endpoints:
1. **API Quota Depletion:** If deployed publicly on the internet without IP filtering, malicious actors could automate requests up to the 30 req/min rate limit, slowly exhausting Gnani API credits.
2. **Mitigation Recommendation for Public Deployment:**
   - In production, place the Express server behind a reverse proxy (e.g., Cloudflare or Caddy) with Web Application Firewall (WAF) rules, bot challenges (Turnstile), and global IP reputation filtering.
   - For shop deployment, bind the server to `127.0.0.1` or the shop's private local network (LAN) with a shared terminal bearer token or subnet restriction.

---

## 5. Order Safety & Verification Integrity

The core mission of BOLPROOF is preventing erroneous grocery orders. The application enforces:

1. **Explicit Confirmation Model:**
   - Spoken transcription never triggers automatic confirmation or billing.
   - Transcripts are presented in an editable field before processing.
   - Ambiguous quantities (e.g. *“आधा चीनी”*, *“एक नमक”*, *“3 सरसों तेल”*) remain unconfirmed until clarified.
2. **Zero Cross-Item Leakage:**
   - Deterministic clause boundaries isolate each product's numeric quantities.
   - Resolving one product's clarification never marks other ambiguous items as resolved.
3. **Unit Type Integrity:**
   - Solid staples (`चीनी`, `नमक`) prompt for mass units (`g`, `kg`).
   - Liquid items (`सरसों तेल`) strictly prompt for volume units (`ml`, `L`).
4. **Idempotent UI & Reset Protection:**
   - Resetting clears all parsed items and draft orders; no stale clarification state persists.

---

## 6. Privacy & Data Handling

### Audio Data Handling
- **Ephemeral Processing:** Recorded audio is streamed directly in memory (as a buffer) through Node.js to Gnani Prisma STT and released. No audio files are written to the local disk, S3 buckets, or temporary directories.
- **Zero Local Logging:** Neither audio recordings nor transcript texts are logged to stdout, syslog, or disk logs.
- **Third-Party Data Flow:** Audio is sent to Gnani AI (`api.vachana.ai`) solely for the purpose of speech-to-text recognition and text-to-speech synthesis under the terms of the user's Gnani service agreement.

---

## 7. Dependency Security Review

- **Direct Dependencies Inspected:**
  - `express`: 4.21.2 (Active LTS)
  - `cors`: 2.8.6 (Latest stable)
  - `multer`: 2.5.0 (Single-file memory storage)
  - `dotenv`: 17.2.3 (Clean, standard environment loader)
  - `lucide-react`: 0.546.0 (Zero-dependency icon set)
  - `motion`: 12.23.24 (Animation library)
  - `three`: 0.186.1 (3D WebGL renderer)
- **Dependency Cleanups:**
  - Removed unused reference to `@google/genai` in `.env.example`.
- **Known Limitation:** Running live `npm audit` was restricted in the sandboxed execution environment due to lack of outbound registry access. A manual manifest inspection revealed no legacy or known high-risk dependencies.

---

## 8. Summary of Hardening Actions

```
[✓] Hardened server.ts with sliding-window rate limiting (30 req/min voice, 120 req/min general)
[✓] Enforced upload.single('audio_file') with 10MB memory limit
[✓] Added buffer magic-byte validation for WAV, OGG, MP3, FLAC, WebM, and AAC
[✓] Configured defensive HTTP headers (nosniff, SAMEORIGIN, strict-origin, microphone permissions)
[✓] Made CORS allowlist configurable via ALLOWED_ORIGINS
[✓] Sanitized TTS text input (max 500 chars, control character stripping)
[✓] Sanitized production error responses
[✓] Verified zero credential exposure in source code and frontend build output
[✓] Created clean, placeholder-only .env.example
```
