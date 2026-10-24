import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ============================================================================
// 1. HTTP SECURITY HEADERS
// ============================================================================
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self)');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ============================================================================
// 2. CONFIGURABLE CORS ALLOWLIST
// ============================================================================
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not permitted by BOLPROOF CORS policy.`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// 3. IN-MEMORY RATE LIMITER (Abuse Prevention on Expensive Voice Endpoints)
// ============================================================================
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(windowMs: number, maxRequests: number, endpointName = 'Endpoint') {
  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired records every 5 minutes
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  timer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    let record = ipStore.get(clientIp);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipStore.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: `Rate limit exceeded for ${endpointName}. Too many requests. Please retry in ${retryAfterSec}s.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// 30 voice requests per minute per IP for STT / TTS; 120 per minute for health
const voiceRateLimiter = createRateLimiter(60 * 1000, 30, 'Voice Service');
const generalRateLimiter = createRateLimiter(60 * 1000, 120, 'API Service');

// ============================================================================
// 4. AUDIO BUFFER MAGIC BYTES VALIDATION (Defense-in-depth against malicious payloads)
// ============================================================================
export function validateAudioMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;

  // WAV / RIFF: 'RIFF' at byte 0 and 'WAVE' at byte 8
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return true;
  }

  // OGG container: 'OggS'
  if (buffer.toString('ascii', 0, 4) === 'OggS') {
    return true;
  }

  // FLAC container: 'fLaC'
  if (buffer.toString('ascii', 0, 4) === 'fLaC') {
    return true;
  }

  // MP3 ID3 container: 'ID3'
  if (buffer.toString('ascii', 0, 3) === 'ID3') {
    return true;
  }

  // MP3 MPEG audio frame sync: 0xFF followed by 0xE0 or higher (0xFB, 0xFA, 0xF3, 0xF2)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return true;
  }

  // WebM / Matroska EBML ID: 0x1A 0x45 0xDF 0xA3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return true;
  }

  // AAC ADTS frame sync: 0xFF followed by 0xF0
  if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
    return true;
  }

  return false;
}

// ============================================================================
// 5. RESTRICTIVE MULTER UPLOAD CONFIGURATION
// ============================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit (strictly enforces reasonable voice duration)
    files: 1,                   // Exactly one file allowed
    fields: 5,                  // Max 5 text fields
  },
  fileFilter: (_req, file, cb) => {
    // Validate audio MIME type or extension
    const isAudioMime =
      file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream';
    const isAudioExt = /\.(wav|mp3|ogg|flac|aac|m4a|webm)$/i.test(file.originalname);

    if (isAudioMime || isAudioExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a valid audio file (WAV, MP3, OGG, FLAC, WebM).'));
    }
  },
});

const GNANI_STT_URL = 'https://api.vachana.ai/stt/v3';
const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';

function getApiKey(): string | null {
  const key = process.env.GNANI_API_KEY?.trim();
  if (!key || key === 'replace_with_your_key' || key.length < 5) {
    return null;
  }
  return key;
}

// ============================================================================
// 6. HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/api/health', generalRateLimiter, (_req: Request, res: Response) => {
  const configured = getApiKey() !== null;
  res.json({
    status: 'ok',
    service: 'BOLPROOF Voice Backend',
    gnaniConfigured: configured,
    security: {
      rateLimiting: 'enabled',
      magicByteValidation: 'enabled',
      maxUploadSizeMb: 10,
    },
    endpoints: {
      transcribe: 'POST /api/voice/transcribe',
      speak: 'POST /api/voice/speak',
    },
  });
});

// ============================================================================
// 7. POST /api/voice/transcribe (Gnani Prisma STT v3 Proxy)
// ============================================================================
app.post(
  '/api/voice/transcribe',
  voiceRateLimiter,
  upload.single('audio_file'),
  async (req: Request, res: Response) => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return res.status(500).json({
          error:
            'GNANI_API_KEY is missing or unconfigured. Please configure a valid Gnani API key in the server environment.',
          code: 'MISSING_CREDENTIALS',
        });
      }

      // Validate presence of uploaded file
      const file = req.file;
      if (!file || !file.buffer || file.buffer.length === 0) {
        return res.status(400).json({
          error: 'No audio file provided in request. Please upload an audio file under field "audio_file".',
          code: 'EMPTY_AUDIO',
        });
      }

      // Verify authentic audio magic bytes in buffer
      if (!validateAudioMagicBytes(file.buffer)) {
        return res.status(400).json({
          error:
            'Uploaded file content does not match a recognized audio format (WAV, MP3, OGG, FLAC, WebM).',
          code: 'INVALID_AUDIO_CONTENT',
        });
      }

      // Validate and sanitize language code
      const rawLang = req.body.language_code || 'hi-IN';
      const languageCode = String(rawLang).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10) || 'hi-IN';

      // Prepare multipart payload for Gnani Prisma STT
      const formData = new FormData();
      const audioBlob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || 'audio/wav',
      });
      formData.append('audio_file', audioBlob, file.originalname || 'recording.wav');
      formData.append('language_code', languageCode);

      // 30s timeout controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      let response: globalThis.Response;
      try {
        response = await fetch(GNANI_STT_URL, {
          method: 'POST',
          headers: {
            'X-API-Key-ID': apiKey,
          },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMsg = `Prisma STT error (status ${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorJson.detail || errorMsg;
        } catch {
          if (errorText) errorMsg = errorText;
        }

        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({
            error: 'Unauthorized: Invalid or expired Gnani API credentials.',
            code: 'INVALID_CREDENTIALS',
          });
        }

        if (response.status === 429) {
          return res.status(429).json({
            error: 'Upstream Gnani API quota or rate limit exceeded.',
            code: 'UPSTREAM_RATE_LIMIT_EXCEEDED',
          });
        }

        return res.status(response.status).json({
          error: errorMsg,
          code: 'STT_PROVIDER_ERROR',
        });
      }

      const responseText = await response.text().catch(() => '');
      let result: Record<string, unknown> = {};
      try {
        result = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
      } catch {
        return res.status(502).json({
          error: 'Gnani Prisma STT returned an invalid response format from upstream.',
          code: 'INVALID_UPSTREAM_RESPONSE',
        });
      }

      // Extract transcript from supported response schemas
      let transcript = '';
      if (typeof result.transcript === 'string') {
        transcript = result.transcript.trim();
      } else if (
        result.result &&
        typeof (result.result as Record<string, unknown>).transcript === 'string'
      ) {
        transcript = ((result.result as Record<string, unknown>).transcript as string).trim();
      } else if (typeof result.text === 'string') {
        transcript = result.text.trim();
      }

      return res.json({
        success: true,
        transcript,
        languageCode,
        requestId: result.request_id || result.requestId || null,
        isEmpty: transcript.length === 0,
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Prisma STT transcription timed out (30s limit). Please record a shorter audio clip.',
          code: 'TIMEOUT',
        });
      }

      return res.status(500).json({
        error: 'An unexpected error occurred during transcription.',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// ============================================================================
// 8. POST /api/voice/speak (Gnani Timbre TTS v2.5 Proxy)
// ============================================================================
app.post('/api/voice/speak', voiceRateLimiter, async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error:
          'GNANI_API_KEY is missing or unconfigured. Please configure a valid Gnani API key in the server environment.',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const { text, voice, model, language } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text parameter is required for speech synthesis.',
        code: 'EMPTY_TEXT',
      });
    }

    // Strip unprintable control characters and trim
    // eslint-disable-next-line no-control-regex
    const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

    if (cleanText.length > 500) {
      return res.status(400).json({
        error: 'Text length exceeds maximum allowed limit of 500 characters for clarification synthesis.',
        code: 'TEXT_TOO_LONG',
      });
    }

    // Prepare payload according to Gnani Timbre v2.5 API specification
    const ttsPayload = {
      text: cleanText,
      voice: typeof voice === 'string' && /^[a-zA-Z0-9_-]+$/.test(voice) ? voice : 'Nalini',
      model: typeof model === 'string' && /^[a-zA-Z0-9._-]+$/.test(model) ? model : 'timbre-v2.5',
      language: typeof language === 'string' && /^[a-zA-Z0-9_-]+$/.test(language) ? language : 'hi-IN',
      speed: 1,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: globalThis.Response;
    try {
      response = await fetch(GNANI_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': apiKey,
        },
        body: JSON.stringify(ttsPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = `Timbre TTS error (status ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.message || errorJson.error || errorJson.detail || errorMsg;
      } catch {
        if (errorText) errorMsg = errorText;
      }

      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired Gnani API credentials.',
          code: 'INVALID_CREDENTIALS',
        });
      }

      return res.status(response.status).json({
        error: errorMsg,
        code: 'TTS_PROVIDER_ERROR',
      });
    }

    // Gnani Timbre returns raw binary WAV audio stream
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(buffer);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Timbre TTS synthesis timed out (30s limit).',
        code: 'TIMEOUT',
      });
    }

    return res.status(500).json({
      error: 'An unexpected error occurred during speech synthesis.',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================================================
// 9. CENTRALIZED ERROR HANDLING MIDDLEWARE
// ============================================================================
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'Uploaded audio file exceeds the maximum allowed limit of 10 MB.',
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected multipart field. Audio must be uploaded under the field name "audio_file".',
        code: 'UNEXPECTED_FIELD',
      });
    }
    return res.status(400).json({
      error: `Audio upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  }

  const error = err as Error;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(500).json({
    error: isProd ? 'Internal server error' : error.message || 'Internal server error',
    code: 'SERVER_ERROR',
  });
});

// Start listener only when directly executed (e.g. via npm run server) and not in test runners
const isDirectRun =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOLPROOF Voice Backend running on http://localhost:${PORT}`);
    console.log(`Gnani API Key Configured: ${getApiKey() ? 'Yes' : 'No (using placeholder)'}`);
    console.log(`Security: Rate limiting, magic byte validation, and security headers active.`);
  });
}

export default app;
export { app };
