'use server';
/**
 * @fileOverview Analyzes an image to extract relevant information such as model numbers or software versions.
 *
 * - analyzeImageForInfo - A function that handles the image analysis process.
 * - AnalyzeImageForInfoInput - The input type for the analyzeImageForInfo function.
 * - AnalyzeImageForInfoOutput - The return type for the analyzeImageForInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageForInfoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo submitted with a ticket, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The user provided description of the problem.'),
});
export type AnalyzeImageForInfoInput = z.infer<typeof AnalyzeImageForInfoInputSchema>;

const AnalyzeImageForInfoOutputSchema = z.object({
  extractedInformation: z
    .string()
    .describe(
      'Relevant information extracted from the image, such as model numbers, software versions, or error messages.'
    ),
});
export type AnalyzeImageForInfoOutput = z.infer<typeof AnalyzeImageForInfoOutputSchema>;

export async function analyzeImageForInfo(
  input: AnalyzeImageForInfoInput
): Promise<AnalyzeImageForInfoOutput> {
  return analyzeImageForInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImageForInfoPrompt',
  input: {schema: AnalyzeImageForInfoInputSchema},
  output: {schema: AnalyzeImageForInfoOutputSchema},
  prompt: `You are an expert support technician. Analyze the image and description provided by the user to extract relevant information that would help direct the ticket to the correct support person, such as model numbers, software versions, or error messages.

Description: {{{description}}}
Photo: {{media url=photoDataUri}}`,
});

const analyzeImageForInfoFlow = ai.defineFlow(
  {
    name: 'analyzeImageForInfoFlow',
    inputSchema: AnalyzeImageForInfoInputSchema,
    outputSchema: AnalyzeImageForInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
