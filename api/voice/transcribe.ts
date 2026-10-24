/**
 * Vercel Serverless Function: POST /api/voice/transcribe
 *
 * Proxies speech-to-text requests to Gnani Prisma STT (v3) directly from Vercel's serverless infrastructure.
 * Keeps GNANI_API_KEY securely on the server side.
 */

export const config = {
  maxDuration: 30, // 30 seconds max execution time
};

const GNANI_STT_URL = 'https://api.vachana.ai/stt/v3';

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
        error: 'Method not allowed. Use POST for voice transcription.',
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

    // Parse incoming multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid multipart/form-data payload.',
          code: 'MALFORMED_REQUEST',
        }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const languageCode = (formData.get('language_code') || 'hi-IN').toString().trim();

    // Prepare upstream multipart payload
    const upstreamFormData = new FormData();
    upstreamFormData.append('audio_file', audioFile, 'voice_order.wav');
    upstreamFormData.append('language_code', languageCode);

    // 30s timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(GNANI_STT_URL, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': apiKey,
        },
        body: upstreamFormData,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const error = err as Error;
      return new Response(
        JSON.stringify({
          error: `Failed to connect to Gnani Prisma STT service: ${error.message}`,
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
            headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const responseText = await upstreamResponse.text().catch(() => '');
    let result: Record<string, unknown> = {};
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
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

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
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({
          error: 'Prisma STT transcription timed out (30s limit). Please record a shorter audio clip.',
          code: 'TIMEOUT',
        }),
        {
          status: 504,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred during transcription.',
        code: 'INTERNAL_ERROR',
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
}
