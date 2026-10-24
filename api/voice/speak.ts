/**
 * Vercel Serverless Function: POST /api/voice/speak
 *
 * Proxies text-to-speech requests to Gnani Timbre TTS (v2.5) directly from Vercel's serverless infrastructure.
 * Keeps GNANI_API_KEY securely on the server side.
 */

export const config = {
  maxDuration: 30, // 30 seconds max execution time
};

const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, X-API-Key-ID',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
}

export default async function handler(request: Request): Promise<Response> {
  const headers = corsHeaders();

  // 1. Handle preflight CORS OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  // 2. Reject non-POST methods
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed. Use POST for speech synthesis.',
        code: 'METHOD_NOT_ALLOWED',
      }),
      {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const apiKey = process.env.GNANI_API_KEY?.trim();
    if (!apiKey || apiKey === 'replace_with_your_key' || apiKey.length < 5) {
      return new Response(
        JSON.stringify({
          error:
            'GNANI_API_KEY is not configured in Vercel. Please add your Gnani API key under Vercel Project Settings > Environment Variables.',
          code: 'MISSING_CREDENTIALS',
        }),
        {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON request body.',
          code: 'MALFORMED_JSON',
        }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
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

    let upstreamResponse: Response;
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
    } catch (err: unknown) {
      clearTimeout(timeout);
      const error = err as Error;
      return new Response(
        JSON.stringify({
          error: `Failed to connect to Gnani Timbre TTS service: ${error.message}`,
          code: 'UPSTREAM_CONNECTION_FAILED',
        }),
        {
          status: 502,
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const audioBytes = await upstreamResponse.arrayBuffer();
    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred during speech synthesis.',
        code: 'INTERNAL_ERROR',
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
}
