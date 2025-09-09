// Summarize Ticket Problem Flow
'use server';

/**
 * @fileOverview Summarizes the problem described in a ticket using GenAI.
 *
 * - summarizeTicketProblem - A function that summarizes the ticket problem.
 * - SummarizeTicketProblemInput - The input type for the summarizeTicketProblem function.
 * - SummarizeTicketProblemOutput - The return type for the summarizeTicketProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTicketProblemInputSchema = z.object({
  problemDescription: z
    .string()
    .describe('The detailed description of the problem reported in the ticket.'),
});
export type SummarizeTicketProblemInput = z.infer<typeof SummarizeTicketProblemInputSchema>;

const SummarizeTicketProblemOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the problem described in the ticket.'),
});
export type SummarizeTicketProblemOutput = z.infer<typeof SummarizeTicketProblemOutputSchema>;

export async function summarizeTicketProblem(
  input: SummarizeTicketProblemInput
): Promise<SummarizeTicketProblemOutput> {
  return summarizeTicketProblemFlow(input);
}

const summarizeTicketProblemPrompt = ai.definePrompt({
  name: 'summarizeTicketProblemPrompt',
  input: {schema: SummarizeTicketProblemInputSchema},
  output: {schema: SummarizeTicketProblemOutputSchema},
  prompt: `You are a support administrator. Summarize the following problem description from a user ticket so that it can be quickly understood:\n\nProblem Description: {{{problemDescription}}}`,
});

const summarizeTicketProblemFlow = ai.defineFlow(
  {
    name: 'summarizeTicketProblemFlow',
    inputSchema: SummarizeTicketProblemInputSchema,
    outputSchema: SummarizeTicketProblemOutputSchema,
  },
  async input => {
    const {output} = await summarizeTicketProblemPrompt(input);
    return output!;
  }
);
