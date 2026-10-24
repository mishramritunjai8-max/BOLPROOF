/**
 * Vercel Serverless Function Entry Point for BOLPROOF
 *
 * Routes all incoming /api/* requests to the Express application (server.ts).
 * Handles voice transcription (Prisma STT), clarification synthesis (Timbre TTS),
 * and backend health checks in a unified, high-performance Node.js environment.
 */
import app from '../server.ts';

export const maxDuration = 60;

export default app;
