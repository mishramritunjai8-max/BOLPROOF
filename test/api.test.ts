/**
 * Automated API Security, Magic Byte, and Rate Limiting Tests for BOLPROOF
 *
 * Tests:
 * 1. Audio magic bytes validation (WAV, MP3, OGG, FLAC, WebM, rejection of arbitrary binary/text).
 * 2. Rate limiter middleware behavior (headers, limit decrement, HTTP 429 enforcement, Retry-After header, multi-IP isolation).
 * 3. Text-to-Speech input validation and sanitization contracts.
 * 4. Error response structures and HTTP codes.
 */

import { validateAudioMagicBytes, createRateLimiter } from '../server.ts';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`PASS: ${message}`);
    passCount++;
  } else {
    console.error(`FAIL: ${message}`);
    failCount++;
  }
}

// Helper to simulate Express Request and Response objects
interface MockResponse {
  statusCode: number;
  headers: Record<string, string | number>;
  body: unknown;
  setHeader: (key: string, val: string | number) => MockResponse;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  send: (data: unknown) => MockResponse;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key: string, val: string | number) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    send(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res;
}

function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING AUTOMATED BOLPROOF API & SECURITY TESTS');
  console.log('======================================================\n');

  // =========================================================================
  // 1. Audio Magic Bytes Unit Tests
  // =========================================================================
  console.log('--- 1. Audio Magic Bytes Unit Tests ---');

  // Genuine WAV header (RIFF....WAVE)
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x24, 0x00, 0x00, 0x00, // file length - 8
    0x57, 0x41, 0x56, 0x45, // 'WAVE'
    0x66, 0x6d, 0x74, 0x20, // 'fmt '
  ]);
  assert(validateAudioMagicBytes(wavHeader) === true, 'Valid RIFF/WAV header must return true');

  // Genuine OGG header (OggS)
  const oggHeader = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]);
  assert(validateAudioMagicBytes(oggHeader) === true, 'Valid OggS header must return true');

  // Genuine FLAC header (fLaC)
  const flacHeader = Buffer.from([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22]);
  assert(validateAudioMagicBytes(flacHeader) === true, 'Valid fLaC header must return true');

  // Genuine MP3 ID3 header (ID3)
  const mp3Id3Header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
  assert(validateAudioMagicBytes(mp3Id3Header) === true, 'Valid MP3 ID3 header must return true');

  // Genuine MP3 MPEG sync frame (0xFF 0xFB)
  const mp3FrameSync = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  assert(validateAudioMagicBytes(mp3FrameSync) === true, 'Valid MP3 frame sync header must return true');

  // Genuine WebM / Matroska EBML ID (0x1A 0x45 0xDF 0xA3)
  const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  assert(validateAudioMagicBytes(webmHeader) === true, 'Valid WebM/EBML header must return true');

  // Plain text file pretending to be audio
  const textBuffer = Buffer.from('This is a plain text file pretending to be audio.');
  assert(validateAudioMagicBytes(textBuffer) === false, 'Plain text file must be rejected');

  // Buffer shorter than 4 bytes
  const shortBuffer = Buffer.from([0x01, 0x02]);
  assert(validateAudioMagicBytes(shortBuffer) === false, 'Buffer shorter than 4 bytes must be rejected');

  // Non-audio executable DOS / PE header ('MZ')
  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
  assert(validateAudioMagicBytes(exeBuffer) === false, 'Non-audio binary executable header must be rejected');

  // =========================================================================
  // 2. In-Memory Rate Limiter Unit Tests
  // =========================================================================
  console.log('\n--- 2. In-Memory Rate Limiter Tests ---');

  const testLimiter = createRateLimiter(60 * 1000, 5, 'Test Service'); // 5 req limit

  // Call 1: Should pass
  const req1: any = { headers: { 'x-forwarded-for': '203.0.113.195' }, socket: {} };
  const res1 = createMockRes();
  let nextCalled1: boolean = false;
  testLimiter(req1, res1 as any, () => {
    nextCalled1 = true;
  });

  assert(Boolean(nextCalled1), 'Request 1 under limit must call next()');
  assert(res1.headers['x-ratelimit-limit'] === 5, 'RateLimit-Limit header must be 5');
  assert(res1.headers['x-ratelimit-remaining'] === 4, 'RateLimit-Remaining header must be 4');

  // Call 2 to 5: consume quota
  for (let i = 2; i <= 5; i++) {
    const res = createMockRes();
    testLimiter(req1, res as any, () => {});
  }

  // Call 6: Must trigger HTTP 429
  const resExceeded = createMockRes();
  let nextCalled6: boolean = false;
  testLimiter(req1, resExceeded as any, () => {
    nextCalled6 = true;
  });

  assert(!nextCalled6, 'Request 6 exceeding limit must NOT call next()');
  assert(resExceeded.statusCode === 429, 'Request exceeding limit must return HTTP status 429');
  assert(
    typeof resExceeded.headers['retry-after'] === 'number' && Number(resExceeded.headers['retry-after']) > 0,
    'Rate limit response must set a positive Retry-After header'
  );
  const body = resExceeded.body as Record<string, unknown>;
  assert(body?.code === 'RATE_LIMIT_EXCEEDED', 'Error code must be RATE_LIMIT_EXCEEDED');

  // IP Isolation: A different IP should NOT be blocked
  const req2: any = { headers: { 'x-forwarded-for': '198.51.100.42' }, socket: {} };
  const resOtherIp = createMockRes();
  let nextCalledOther: boolean = false;
  testLimiter(req2, resOtherIp as any, () => {
    nextCalledOther = true;
  });

  assert(Boolean(nextCalledOther), 'Different IP must have its own independent rate-limit bucket');
  assert(resOtherIp.headers['x-ratelimit-remaining'] === 4, 'New IP must start with fresh quota');

  // =========================================================================
  // 3. TTS Text Sanitization Logic Unit Tests
  // =========================================================================
  console.log('\n--- 3. TTS Input Validation & Sanitization Tests ---');

  // Text length enforcement logic
  const sanitizeTtsText = (input: unknown): { error?: string; cleanText?: string } => {
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return { error: 'EMPTY_TEXT' };
    }
    // eslint-disable-next-line no-control-regex
    const clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    if (clean.length > 500) {
      return { error: 'TEXT_TOO_LONG' };
    }
    return { cleanText: clean };
  };

  assert(sanitizeTtsText('').error === 'EMPTY_TEXT', 'Empty string must be rejected');
  assert(sanitizeTtsText('   ').error === 'EMPTY_TEXT', 'Whitespace-only string must be rejected');
  assert(sanitizeTtsText(null).error === 'EMPTY_TEXT', 'Null input must be rejected');
  assert(sanitizeTtsText(123).error === 'EMPTY_TEXT', 'Non-string input must be rejected');

  const oversizeText = 'चीनी '.repeat(150);
  assert(sanitizeTtsText(oversizeText).error === 'TEXT_TOO_LONG', 'Text > 500 characters must be rejected');

  const controlCharsText = 'चीनी कितनी चाहिए?\x00\x08\x1F';
  const sanitized = sanitizeTtsText(controlCharsText);
  assert(sanitized.cleanText === 'चीनी कितनी चाहिए?', 'Unprintable ASCII control characters must be stripped');

  console.log('\n======================================================');
  if (failCount === 0) {
    console.log(`ALL ${passCount} API & SECURITY TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.error(`FAILED: ${failCount} tests failed out of ${passCount + failCount}`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

runTests();
