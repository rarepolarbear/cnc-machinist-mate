'use server';

import {
  generateSafeGCode,
  type GenerateSafeGCodeInput,
  type GenerateSafeGCodeOutput,
} from '@/ai/flows/generate-safe-g-code';

export async function generateGCodeAction(
  input: GenerateSafeGCodeInput
): Promise<{ data: GenerateSafeGCodeOutput | null; error: string | null }> {
  try {
    const result = await generateSafeGCode(input);
    return { data: result, error: null };
  } catch (e) {
    console.error('G-code generation failed:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unexpected error occurred.';
    return { data: null, error: `Failed to generate G-code. ${errorMessage}` };
  }
}
