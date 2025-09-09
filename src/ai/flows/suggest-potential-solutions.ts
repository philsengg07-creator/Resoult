'use server';

/**
 * @fileOverview An AI agent to suggest potential solutions for IT support tickets.
 *
 * - suggestPotentialSolutions - A function that suggests potential solutions based on the ticket description and extracted image information.
 * - SuggestPotentialSolutionsInput - The input type for the suggestPotentialSolutions function.
 * - SuggestPotentialSolutionsOutput - The return type for the suggestPotentialSolutions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPotentialSolutionsInputSchema = z.object({
  description: z.string().describe('The description of the problem from the ticket.'),
  extractedImageInformation: z
    .string()
    .describe('Extracted information from the image, such as model number or software version.'),
});
export type SuggestPotentialSolutionsInput = z.infer<
  typeof SuggestPotentialSolutionsInputSchema
>;

const SuggestPotentialSolutionsOutputSchema = z.object({
  suggestedSolutions: z
    .string()
    .describe('Suggested solutions for the problem, based on the description and extracted image information.'),
});
export type SuggestPotentialSolutionsOutput = z.infer<
  typeof SuggestPotentialSolutionsOutputSchema
>;

export async function suggestPotentialSolutions(
  input: SuggestPotentialSolutionsInput
): Promise<SuggestPotentialSolutionsOutput> {
  return suggestPotentialSolutionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPotentialSolutionsPrompt',
  input: {schema: SuggestPotentialSolutionsInputSchema},
  output: {schema: SuggestPotentialSolutionsOutputSchema},
  prompt: `You are an expert IT support assistant.

  Based on the problem description and any extracted information from the user's submitted image, suggest potential solutions to resolve the issue.

  Problem Description: {{{description}}}
  Extracted Image Information: {{{extractedImageInformation}}}

  Suggest potential solutions:
  `,
});

const suggestPotentialSolutionsFlow = ai.defineFlow(
  {
    name: 'suggestPotentialSolutionsFlow',
    inputSchema: SuggestPotentialSolutionsInputSchema,
    outputSchema: SuggestPotentialSolutionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
