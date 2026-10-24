/**
 * Vercel Serverless Function: GET /api/health
 */

export default async function handler(): Promise<Response> {
  const configured = Boolean(
    process.env.GNANI_API_KEY &&
      process.env.GNANI_API_KEY.trim().length > 5 &&
      process.env.GNANI_API_KEY !== 'replace_with_your_key'
  );

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'BOLPROOF Vercel Serverless Backend',
      gnaniConfigured: configured,
      runtime: 'Vercel Serverless (Node.js)',
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
}
