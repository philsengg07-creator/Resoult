
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { next } from '@genkit-ai/next';
import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

export const ai = genkit({
  plugins: [
    next(),
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
