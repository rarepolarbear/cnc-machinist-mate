'use server';
/**
 * @fileOverview Safe G-code generation flow for CNC Machinist Mate.
 *
 * - generateSafeGCode - A function that generates G-code with safety validations.
 * - GenerateSafeGCodeInput - The input type for the generateSafeGCode function.
 * - GenerateSafeGCodeOutput - The return type for the generateSafeGCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSafeGCodeInputSchema = z.object({
  parameter1: z.number().describe('Parameter 1 for circular interpolation.'),
  parameter2: z.number().describe('Parameter 2 for circular interpolation.'),
  parameter3: z.number().describe('Parameter 3 for circular interpolation.'),
  // Add more parameters as needed for G-code generation
});
export type GenerateSafeGCodeInput = z.infer<typeof GenerateSafeGCodeInputSchema>;

const GenerateSafeGCodeOutputSchema = z.object({
  gCode: z.string().describe('The generated G-code block.'),
  safetyChecks: z.array(z.string()).describe('List of safety checks performed.'),
  valid: z.boolean().describe('Whether the G-code is valid or not'),
});
export type GenerateSafeGCodeOutput = z.infer<typeof GenerateSafeGCodeOutputSchema>;

export async function generateSafeGCode(input: GenerateSafeGCodeInput): Promise<GenerateSafeGCodeOutput> {
  return generateSafeGCodeFlow(input);
}

const generateSafeGCodePrompt = ai.definePrompt({
  name: 'generateSafeGCodePrompt',
  input: {schema: GenerateSafeGCodeInputSchema},
  output: {schema: GenerateSafeGCodeOutputSchema},
  prompt: `You are a CNC machinist expert, generating G-code for a Haas CNC mill.

  Generate G-code based on the provided parameters, and validate the code against common safety constraints and machine limitations.
  Specifically check for:
  1.  Tool collision:
      *   Verify the toolpath doesn't cause collisions with fixtures or machine components.
  2.  Over-travel:
      *   Ensure the generated G-code doesn't exceed the machine's axis limits.
  3.  Rapid Traverse:
      *   Confirm that the G-code includes rapid traverse moves to minimize non-cutting time and prevent machine damage.
  4.  Feed rate:
      *   Check the feed rate doesn't exceed the machine's maximum limits and the tool's capabilities.

  Make sure that the G-code follows all safety and machine-specific constraints.

  Output the G-code and a list of safety checks performed.  Set the valid field to 'true' only if all safety checks pass.

  Parameters:
  Parameter1: {{{parameter1}}}
  Parameter2: {{{parameter2}}}
  Parameter3: {{{parameter3}}}
  //Add more parameters as needed for G-code generation
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const generateSafeGCodeFlow = ai.defineFlow(
  {
    name: 'generateSafeGCodeFlow',
    inputSchema: GenerateSafeGCodeInputSchema,
    outputSchema: GenerateSafeGCodeOutputSchema,
  },
  async input => {
    const {output} = await generateSafeGCodePrompt(input);
    return output!;
  }
);
