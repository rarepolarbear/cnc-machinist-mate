'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Bot,
  Check,
  Clipboard,
  Cog,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import type { GenerateSafeGCodeOutput } from '@/ai/flows/generate-safe-g-code';
import { generateGCodeAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  parameter1: z.coerce.number().min(0, 'Parameter must be a positive number.'),
  parameter2: z.coerce.number().min(0, 'Parameter must be a positive number.'),
  parameter3: z.coerce.number().min(0, 'Parameter must be a positive number.'),
});

export function GCodeGenerator() {
  const [result, setResult] = React.useState<GenerateSafeGCodeOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parameter1: 10.0,
      parameter2: 20.0,
      parameter3: 5.0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await generateGCodeAction(values);

    if (response.error) {
      setError(response.error);
    } else {
      setResult(response.data);
    }

    setIsLoading(false);
  }

  const handleCopy = () => {
    if (result?.gCode) {
      navigator.clipboard.writeText(result.gCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full shadow-lg border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Cog className="text-primary" />
          <span>G-Code Generator</span>
        </CardTitle>
        <CardDescription>
          Enter parameters for circular interpolation. Our AI will generate and
          validate the G-code for a Haas CNC mill.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="parameter1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parameter 1 (e.g., Arc Center I)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parameter2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parameter 2 (e.g., Arc Center J)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parameter3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parameter 3 (e.g., Radius R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button size="lg" type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Bot className="mr-2 h-5 w-5" />
              )}
              Generate G-Code
            </Button>
          </form>
        </Form>

        {isLoading && (
          <div className="text-center p-8 mt-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              AI is generating and validating your G-code...
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="mt-8 space-y-6 animate-in fade-in duration-500">
            <Separator />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="text-xl font-semibold font-headline">
                Generated Output
              </h3>
              <Badge
                variant={result.valid ? 'default' : 'destructive'}
                className="text-base py-1 px-3"
              >
                {result.valid ? (
                  <ShieldCheck className="mr-2 h-5 w-5" />
                ) : (
                  <AlertTriangle className="mr-2 h-5 w-5" />
                )}
                {result.valid ? 'Validation Passed' : 'Validation Failed'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gcode-output">G-Code</Label>
              <div className="relative rounded-md bg-secondary p-4 font-mono text-sm group">
                <pre
                  id="gcode-output"
                  className="whitespace-pre-wrap break-all"
                >
                  <code>{result.gCode}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopy}
                  aria-label="Copy G-code"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-accent" />
                  ) : (
                    <Clipboard className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Safety Checks Performed</Label>
              <ul className="list-disc list-inside space-y-2 rounded-md border p-4 text-muted-foreground bg-secondary/50">
                {result.safetyChecks.map((check, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 mt-1 text-primary shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
