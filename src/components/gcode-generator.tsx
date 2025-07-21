'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clipboard,
  Cog,
  Check,
  Zap,
} from 'lucide-react';

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

const formSchema = z.object({
  cutterDiameter: z.coerce.number().positive('Must be positive.'),
  circleDiameter: z.coerce.number().positive('Must be positive.'),
  speed: z.coerce.number().int().positive('Must be a positive integer.'),
  feed: z.coerce.number().positive('Must be positive.'),
  depthOfCut: z.coerce.number().positive('Must be positive.'),
  stepover: z.coerce.number().positive('Must be positive.'),
});

type FormValues = z.infer<typeof formSchema>;

function generateGCode(data: FormValues): string {
  const { cutterDiameter, circleDiameter, speed, feed, depthOfCut, stepover } = data;
  const toolRadius = cutterDiameter / 2;
  const circleRadius = circleDiameter / 2;
  const effectiveRadius = circleRadius - toolRadius;
  const stepoverAmount = stepover;

  if (effectiveRadius <= 0) {
    return 'Error: Cutter diameter is larger than or equal to the circle diameter.';
  }

  let gcode = `(Circular Interpolation G-Code)\n`;
  gcode += `(Cutter Dia: ${cutterDiameter}, Circle Dia: ${circleDiameter})\n`;
  gcode += `G90 G17 G20 G40 G80;\n`;
  gcode += `T1 M06 (SELECT TOOL 1);\n`;
  gcode += `G54;\n`;
  gcode += `M03 S${speed};\n`;
  gcode += `G00 X${effectiveRadius.toFixed(4)} Y0.;\n`;
  gcode += `G43 H01 Z0.1;\n`;
  
  let currentDepth = 0;
  while (currentDepth < depthOfCut) {
    currentDepth = Math.min(currentDepth + depthOfCut, depthOfCut);
    gcode += `G01 Z-${currentDepth.toFixed(4)} F${feed / 2};\n`;

    let currentRadius = effectiveRadius;
    while (currentRadius > 0) {
        gcode += `G02 X${currentRadius.toFixed(4)} Y0. I-${currentRadius.toFixed(4)} J0. F${feed};\n`;
        currentRadius -= stepoverAmount;
        if(currentRadius > 0) {
            gcode += `G01 X${currentRadius.toFixed(4)};\n`;
        } else {
            // Final cleanup pass at the center
             gcode += `G01 X0. Y0.;\n`;
        }
    }
     // Mill the center point
    gcode += `G01 X0. Y0.;\n`;
  }
  
  gcode += `G00 Z1.0;\n`;
  gcode += `M05;\n`;
  gcode += `G91 G28 Z0;\n`;
  gcode += `G91 G28 X0 Y0;\n`;
  gcode += `M30;\n`;

  return gcode;
}

export function GCodeGenerator() {
  const [gCode, setGCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cutterDiameter: 0.5,
      circleDiameter: 3.0,
      speed: 3000,
      feed: 20.0,
      depthOfCut: 0.25,
      stepover: 0.2,
    },
  });

  function onSubmit(values: FormValues) {
    const generatedCode = generateGCode(values);
    setGCode(generatedCode);
  }

  const handleCopy = () => {
    if (gCode) {
      navigator.clipboard.writeText(gCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full shadow-lg border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
          <Cog className="text-primary" />
          <span>Circular Interpolation G-Code</span>
        </CardTitle>
        <CardDescription>
          Enter your parameters to generate G-code for milling a circular pocket on a Haas CNC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="cutterDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cutter Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="circleDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Circle Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="speed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speed (RPM)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feed (IPM)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depthOfCut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Depth of Cut (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stepover"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stepover (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                     <FormDescription>
                      Typically 40-50% of cutter dia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button size="lg" type="submit" className="w-full sm:w-auto">
              <Zap className="mr-2 h-5 w-5" />
              Generate G-Code
            </Button>
          </form>
        </Form>

        {gCode && (
          <div className="mt-8 space-y-6 animate-in fade-in duration-500">
            <Separator />
            <h3 className="text-xl font-semibold font-headline">
              Generated G-Code
            </h3>
            <div className="space-y-2">
              <Label htmlFor="gcode-output">G-Code Block</Label>
              <div className="relative rounded-md bg-secondary p-4 font-mono text-sm group">
                <pre
                  id="gcode-output"
                  className="whitespace-pre-wrap break-all max-h-96 overflow-y-auto"
                >
                  <code>{gCode}</code>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
