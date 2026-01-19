
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import next from '@genkit-ai/next';
import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

const plugins = [
  googleAI({
    apiKey: process.env.GEMINI_API_KEY,
  }),
];

// The 'next' plugin is only compatible with the Next.js server environment,
// not the standalone Genkit development server.
if (process.env.GENKIT_ENV !== 'dev') {
  plugins.push(next());
}


export const ai = genkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
