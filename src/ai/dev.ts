import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-image-for-info.ts';
import '@/ai/flows/suggest-potential-solutions.ts';
import '@/ai/flows/summarize-ticket-problem.ts';