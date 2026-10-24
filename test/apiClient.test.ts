/**
 * Automated Unit Tests for BOLPROOF API Client & Safe Response Parsing
 *
 * Verifies that empty responses (0 bytes), HTML error pages (404/502), and
 * unparseable payloads do NOT crash with:
 * `Failed to execute 'json' on 'Response': Unexpected end of JSON input`.
 */

import { parseApiResponse, getApiEndpoint } from '../src/utils/apiClient.ts';

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

async function assertRejects(
  fn: () => Promise<unknown>,
  expectedSubstring: string,
  message: string
) {
  try {
    await fn();
    console.error(`FAIL (did not throw): ${message}`);
    failCount++;
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.includes(expectedSubstring)) {
      console.log(`PASS: ${message}`);
      passCount++;
    } else {
      console.error(
        `FAIL (message mismatch): ${message}\n  Expected substring: "${expectedSubstring}"\n  Received message:   "${error.message}"`
      );
      failCount++;
    }
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING API CLIENT & SAFE PARSING TESTS');
  console.log('======================================================\n');

  console.log('--- 1. Endpoint Resolution Tests ---');
  assert(getApiEndpoint('/api/voice/transcribe') === '/api/voice/transcribe', 'Relative path preserved by default');
  assert(getApiEndpoint('api/voice/transcribe') === '/api/voice/transcribe', 'Leading slash normalized');

  console.log('\n--- 2. Safe Response Parser Tests (Preventing "Unexpected end of JSON") ---');

  // Test 1: Valid 200 JSON
  const validRes = new Response(JSON.stringify({ success: true, transcript: 'दो किलो चीनी' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const validData = await parseApiResponse<{ transcript: string }>(validRes);
  assert(validData.transcript === 'दो किलो चीनी', 'Valid JSON response must parse successfully');

  // Test 2: Empty 200 response (0 bytes) - Must NOT throw SyntaxError
  const empty200Res = new Response('', {
    status: 200,
  });
  await assertRejects(
    () => parseApiResponse(empty200Res, 'Prisma STT'),
    'empty or invalid response',
    'Empty 200 response must throw clean actionable error, not "Unexpected end of JSON input"'
  );

  // Test 3: HTTP 404 with empty body (Cloudflare Pages missing backend scenario)
  const empty404Res = new Response('', {
    status: 404,
  });
  await assertRejects(
    () => parseApiResponse(empty404Res, 'Prisma STT'),
    'Voice backend endpoint not found (HTTP 404)',
    'Empty 404 must identify missing backend / Cloudflare Pages Functions configuration'
  );

  // Test 4: HTTP 405 Method Not Allowed (Cloudflare static asset rejecting POST)
  const empty405Res = new Response('', {
    status: 405,
  });
  await assertRejects(
    () => parseApiResponse(empty405Res, 'Prisma STT'),
    'HTTP 405 Method Not Allowed',
    'HTTP 405 must report method not allowed clearly'
  );

  // Test 5: HTTP 502 Bad Gateway with HTML error page (Cloudflare proxy drop)
  const html502Res = new Response('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>', {
    status: 502,
    headers: { 'Content-Type': 'text/html' },
  });
  await assertRejects(
    () => parseApiResponse(html502Res, 'Prisma STT'),
    'Voice backend is currently unreachable (HTTP 502)',
    'HTML 502 error page must report unreachable backend clearly'
  );

  // Test 6: Backend error payload with JSON details
  const errorJsonRes = new Response(
    JSON.stringify({ error: 'GNANI_API_KEY is missing or unconfigured.', code: 'MISSING_CREDENTIALS' }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
  await assertRejects(
    () => parseApiResponse(errorJsonRes, 'Prisma STT'),
    'GNANI_API_KEY is missing or unconfigured.',
    'Backend JSON error message must be extracted directly for user display'
  );

  // Test 7: HTTP 429 Rate Limit Exceeded
  const rateLimitRes = new Response('', {
    status: 429,
  });
  await assertRejects(
    () => parseApiResponse(rateLimitRes, 'Prisma STT'),
    'rate limit exceeded',
    'HTTP 429 must report rate limit clearly'
  );

  console.log('\n======================================================');
  if (failCount === 0) {
    console.log(`ALL ${passCount} API CLIENT TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.error(`FAILED: ${failCount} tests failed out of ${passCount + failCount}`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
