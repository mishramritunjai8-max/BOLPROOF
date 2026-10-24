/**
 * Cloudflare Pages Function: GET /api/health
 */

interface Env {
  GNANI_API_KEY?: string;
}

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  const configured = Boolean(
    context.env.GNANI_API_KEY &&
      context.env.GNANI_API_KEY.trim().length > 5 &&
      context.env.GNANI_API_KEY !== 'replace_with_your_key'
  );

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'BOLPROOF Cloudflare Edge Function',
      gnaniConfigured: configured,
      runtime: 'Cloudflare Pages Functions (Edge)',
      endpoints: {
        transcribe: 'POST /api/voice/transcribe',
        speak: 'POST /api/voice/speak',
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
};
