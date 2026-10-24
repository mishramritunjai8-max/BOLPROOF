/**
 * BOLPROOF API Client Utility
 *
 * Provides safe, robust API communication for voice transcription (Prisma STT)
 * and speech synthesis (Timbre TTS):
 * 1. Supports optional VITE_API_URL / VITE_BACKEND_URL for external backend hosting,
 *    falling back to relative URLs (/api/voice/...) for same-origin or Cloudflare Functions.
 * 2. Safely handles empty, non-JSON, and error HTTP responses without crashing on response.json().
 * 3. Provides actionable error messages for common deployment errors (404, 405, 502, 504).
 */

export interface TranscriptionResponse {
  success: boolean;
  transcript: string;
  languageCode?: string;
  requestId?: string | null;
  isEmpty?: boolean;
}

/**
 * Returns the configured backend API base URL, stripped of any trailing slashes.
 * In local development, defaults to '' (using Vite dev proxy).
 * In production, uses VITE_API_URL if configured, or '' for same-origin (Cloudflare Pages Functions).
 */
export function getApiBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
    ''
  ).toString().trim();

  return envUrl.replace(/\/+$/, '');
}

/**
 * Constructs the absolute or relative URL for a given API endpoint path.
 */
export function getApiEndpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}

/**
 * Safely parses an HTTP Response as JSON, guarding against empty bodies (0 bytes),
 * HTML error pages, and server-down responses that cause:
 * `SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input`.
 */
export async function parseApiResponse<T = Record<string, unknown>>(
  response: Response,
  serviceName = 'Voice Service'
): Promise<T> {
  const status = response.status;
  const rawText = await response.text().catch(() => '');

  let parsedJson: Record<string, unknown> | null = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      parsedJson = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      // Non-JSON response (e.g. HTML 404/502 page from Cloudflare or Nginx)
      parsedJson = null;
    }
  }

  // Handle non-2xx HTTP responses
  if (!response.ok) {
    if (parsedJson && (typeof parsedJson.error === 'string' || typeof parsedJson.message === 'string')) {
      const message = (parsedJson.error || parsedJson.message) as string;
      throw new Error(message);
    }

    // Actionable error messages based on HTTP status
    if (status === 404) {
      throw new Error(
        `Voice backend endpoint not found (HTTP 404). If deployed on Cloudflare Pages, please ensure Cloudflare Pages Functions are deployed or set VITE_API_URL in your Cloudflare environment variables to point to your backend server.`
      );
    }

    if (status === 405) {
      throw new Error(
        `HTTP 405 Method Not Allowed: The host server does not accept POST requests on this route. Please verify your backend API URL.`
      );
    }

    if (status === 413) {
      throw new Error('Recorded audio file exceeds the maximum allowed upload limit (10 MB).');
    }

    if (status === 429) {
      throw new Error('Voice verification rate limit exceeded. Please wait a moment before trying again.');
    }

    if (status === 502 || status === 503 || status === 504) {
      throw new Error(
        `Voice backend is currently unreachable (HTTP ${status}). Please check your server status or network connection.`
      );
    }

    const preview = rawText.slice(0, 100).trim();
    if (preview && !preview.startsWith('<')) {
      throw new Error(`${serviceName} error (HTTP ${status}): ${preview}`);
    }

    throw new Error(
      `${serviceName} request failed with HTTP ${status}. Please verify the backend is running and configured.`
    );
  }

  // Handle 2xx responses that returned empty or invalid bodies
  if (!parsedJson) {
    throw new Error(
      `${serviceName} returned an empty or invalid response (HTTP ${status}). Expected JSON.`
    );
  }

  return parsedJson as T;
}

/**
 * Transcribes audio via the backend Gnani Prisma STT proxy.
 */
export async function transcribeAudio(
  wavBlob: Blob,
  languageCode = 'hi-IN'
): Promise<TranscriptionResponse> {
  const endpoint = getApiEndpoint('/api/voice/transcribe');
  const formData = new FormData();
  formData.append('audio_file', wavBlob, 'voice_order.wav');
  formData.append('language_code', languageCode);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(
      `Network connection failed when reaching voice backend at ${endpoint}. Details: ${error.message}`
    );
  }

  return parseApiResponse<TranscriptionResponse>(response, 'Prisma STT');
}

/**
 * Synthesizes speech via the backend Gnani Timbre TTS proxy and returns the binary WAV Blob.
 */
export async function synthesizeSpeech(
  text: string,
  voice = 'Nalini',
  model = 'timbre-v2.5',
  language = 'hi-IN'
): Promise<Blob> {
  const endpoint = getApiEndpoint('/api/voice/speak');

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        model,
        language,
      }),
    });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(
      `Network connection failed when reaching TTS backend at ${endpoint}. Details: ${error.message}`
    );
  }

  if (!response.ok) {
    // Safely parse error message without crashing on empty / HTML response
    await parseApiResponse(response, 'Timbre TTS');
  }

  const audioBlob = await response.blob();
  if (audioBlob.size === 0) {
    throw new Error('TTS service returned empty audio data.');
  }

  return audioBlob;
}
