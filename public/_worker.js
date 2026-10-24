/**
 * Cloudflare Pages Advanced Mode Worker (_worker.js)
 *
 * Automatically included in the root of the build output (`dist/_worker.js`).
 * Intercepts all `/api/*` requests on Cloudflare Pages, proxying them securely to
 * Gnani Prisma STT and Timbre TTS without exposing credentials to frontend bundles.
 * For all non-API routes, passes through to Cloudflare Pages static assets (`env.ASSETS`).
 */

const GNANI_STT_URL = 'https://api.vachana.ai/stt/v3';
const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, X-API-Key-ID',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle preflight CORS OPTIONS for all /api/ routes
    if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // 2. Health check endpoint: GET /api/health
    if (url.pathname === '/api/health') {
      const apiKey = env.GNANI_API_KEY?.trim();
      const configured = Boolean(apiKey && apiKey !== 'replace_with_your_key' && apiKey.length > 5);
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'BOLPROOF Cloudflare Edge Worker',
          gnaniConfigured: configured,
          runtime: 'Cloudflare Pages Advanced Worker (_worker.js)',
          endpoints: {
            transcribe: 'POST /api/voice/transcribe',
            speak: 'POST /api/voice/speak',
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Speech-to-Text Proxy: POST /api/voice/transcribe
    if (url.pathname === '/api/voice/transcribe') {
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({
            error: 'Method not allowed. Use POST for voice transcription.',
            code: 'METHOD_NOT_ALLOWED',
          }),
          {
            status: 405,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const apiKey = env.GNANI_API_KEY?.trim();
      if (!apiKey || apiKey === 'replace_with_your_key' || apiKey.length < 5) {
        return new Response(
          JSON.stringify({
            error:
              'GNANI_API_KEY is not configured in Cloudflare Pages. Please add your Gnani API key under Cloudflare Dashboard > Workers & Pages > [Your BOLPROOF Project] > Settings > Environment variables.',
            code: 'MISSING_CREDENTIALS',
          }),
          {
            status: 500,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      let formData;
      try {
        formData = await request.formData();
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'Invalid multipart/form-data payload.',
            code: 'MALFORMED_REQUEST',
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const audioFile = formData.get('audio_file');
      if (!audioFile || !(audioFile instanceof Blob) || audioFile.size === 0) {
        return new Response(
          JSON.stringify({
            error: 'No audio file provided in request. Please upload an audio file under "audio_file".',
            code: 'EMPTY_AUDIO',
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const languageCode = (formData.get('language_code') || 'hi-IN').toString().trim();

      // Forward to Gnani Prisma STT v3
      const upstreamFormData = new FormData();
      upstreamFormData.append('audio_file', audioFile, 'voice_order.wav');
      upstreamFormData.append('language_code', languageCode);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(GNANI_STT_URL, {
          method: 'POST',
          headers: {
            'X-API-Key-ID': apiKey,
          },
          body: upstreamFormData,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeout);
        return new Response(
          JSON.stringify({
            error: 'Failed to connect to Gnani Prisma STT upstream service.',
            code: 'UPSTREAM_CONNECTION_FAILED',
          }),
          {
            status: 502,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text().catch(() => '');
        let errorMsg = `Prisma STT error (status ${upstreamResponse.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorJson.detail || errorMsg;
        } catch {
          if (errorText) errorMsg = errorText;
        }

        if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
          return new Response(
            JSON.stringify({
              error: 'Unauthorized: Invalid or expired Gnani API credentials.',
              code: 'INVALID_CREDENTIALS',
            }),
            {
              status: 401,
              headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: errorMsg,
            code: 'STT_PROVIDER_ERROR',
          }),
          {
            status: upstreamResponse.status,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const responseText = await upstreamResponse.text().catch(() => '');
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Prisma STT returned an unparseable response from upstream.',
            code: 'INVALID_UPSTREAM_RESPONSE',
          }),
          {
            status: 502,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      let transcript = '';
      if (typeof result.transcript === 'string') {
        transcript = result.transcript.trim();
      } else if (result.result && typeof result.result.transcript === 'string') {
        transcript = result.result.transcript.trim();
      } else if (typeof result.text === 'string') {
        transcript = result.text.trim();
      }

      return new Response(
        JSON.stringify({
          success: true,
          transcript,
          languageCode,
          requestId: result.request_id || result.requestId || null,
          isEmpty: transcript.length === 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Text-to-Speech Proxy: POST /api/voice/speak
    if (url.pathname === '/api/voice/speak') {
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({
            error: 'Method not allowed. Use POST for speech synthesis.',
            code: 'METHOD_NOT_ALLOWED',
          }),
          {
            status: 405,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const apiKey = env.GNANI_API_KEY?.trim();
      if (!apiKey || apiKey === 'replace_with_your_key' || apiKey.length < 5) {
        return new Response(
          JSON.stringify({
            error:
              'GNANI_API_KEY is not configured in Cloudflare Pages. Please add your Gnani API key under Cloudflare Dashboard > Workers & Pages > [Your BOLPROOF Project] > Settings > Environment variables.',
            code: 'MISSING_CREDENTIALS',
          }),
          {
            status: 500,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Invalid JSON request body.',
            code: 'MALFORMED_JSON',
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) {
        return new Response(
          JSON.stringify({
            error: 'Text parameter is required for speech synthesis.',
            code: 'EMPTY_TEXT',
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      if (text.length > 500) {
        return new Response(
          JSON.stringify({
            error: 'Text length exceeds maximum allowed limit of 500 characters.',
            code: 'TEXT_TOO_LONG',
          }),
          {
            status: 400,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const ttsPayload = {
        text,
        voice: typeof body.voice === 'string' ? body.voice : 'Nalini',
        model: typeof body.model === 'string' ? body.model : 'timbre-v2.5',
        language: typeof body.language === 'string' ? body.language : 'hi-IN',
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

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(GNANI_TTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key-ID': apiKey,
          },
          body: JSON.stringify(ttsPayload),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeout);
        return new Response(
          JSON.stringify({
            error: 'Failed to connect to Gnani Timbre TTS upstream service.',
            code: 'UPSTREAM_CONNECTION_FAILED',
          }),
          {
            status: 502,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text().catch(() => '');
        let errorMsg = `Timbre TTS error (status ${upstreamResponse.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorJson.detail || errorMsg;
        } catch {
          if (errorText) errorMsg = errorText;
        }

        return new Response(
          JSON.stringify({
            error: errorMsg,
            code: 'TTS_PROVIDER_ERROR',
          }),
          {
            status: upstreamResponse.status,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          }
        );
      }

      const audioBytes = await upstreamResponse.arrayBuffer();
      return new Response(audioBytes, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 5. For all other routes, pass through to Cloudflare Pages static assets
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
