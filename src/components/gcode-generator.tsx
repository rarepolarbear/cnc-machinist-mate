
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const formSchema = z.object({
  cutterDiameter: z.coerce.number().positive('Must be positive.'),
  circleDiameter: z.coerce.number().positive('Must be positive.'),
  speed: z.coerce.number().int().positive('Must be a positive integer.'),
  feed: z.coerce.number().positive('Must be positive.'),
  totalDepthOfCut: z.coerce.number().positive('Must be positive.'),
  depthPerPass: z.coerce.number().positive('Must be positive.'),
  stepover: z.coerce.number().positive('Must be positive.'),
  millingDirection: z.enum(['climb', 'conventional']),
}).refine(data => data.totalDepthOfCut >= data.depthPerPass, {
    message: "Total depth must be greater than or equal to depth per pass.",
    path: ["totalDepthOfCut"],
});

type FormValues = z.infer<typeof formSchema>;

function generateGCode(data: FormValues): string {
  const { cutterDiameter, circleDiameter, speed, feed, totalDepthOfCut, depthPerPass, stepover, millingDirection } = data;
  
  const toolRadius = cutterDiameter / 2;
  const finalRadius = circleDiameter / 2;

  if (cutterDiameter >= circleDiameter) {
    return 'Error: Cutter diameter must be smaller than the circle diameter.';
  }

  const formatFeed = (f: number) => Number.isInteger(f) ? `${f}.` : f.toString();
  
  const compensationDirection = millingDirection === 'climb' ? 'G41' : 'G42';
  const directionGCode = millingDirection === 'climb' ? 'G03' : 'G02';
  
  let gcode = `(Circular Interpolation - Concentric Circles)\n`;
  gcode += `(Direction: ${millingDirection === 'climb' ? 'Climb' : 'Conventional'})\n`;
  gcode += `(Cutter Dia: ${cutterDiameter}, Circle Dia: ${circleDiameter})\n`;
  gcode += `G90 G17 G20 G40 G80;\n`;
  gcode += `T1 M06 (SELECT TOOL 1);\n`;
  gcode += `G54;\n`;
  gcode += `M03 S${speed};\n`;
  gcode += `G00 X0. Y0.;\n`;
  gcode += `G43 H01 Z0.1;\n`;
  
  let currentDepth = 0;
  
  while (currentDepth < totalDepthOfCut) {
    const previousDepth = currentDepth;
    currentDepth = Math.min(currentDepth + depthPerPass, totalDepthOfCut);
    
    gcode += `(Pass at Z-${currentDepth.toFixed(4)})\n`;
    
    // Helical ramp to depth at center
    const rampRadius = Math.min(stepover, finalRadius - toolRadius) / 2; 
    if (rampRadius > 0) {
        gcode += `G00 Z-${previousDepth.toFixed(4)};\n`;
        gcode += `G01 X0. Y0. F${formatFeed(feed)};\n`
        gcode += `G01 X${rampRadius.toFixed(4)} F${formatFeed(feed / 2)};\n`;
        gcode += `${directionGCode} I-${rampRadius.toFixed(4)} J0. Z-${currentDepth.toFixed(4)} F${formatFeed(feed / 2)};\n`; // Helical move to depth
        gcode += `${directionGCode} I-${rampRadius.toFixed(4)} J0. F${formatFeed(feed)};\n`; // Circle at bottom to flatten
    } else { // If there's no space to ramp (e.g. one pass)
        gcode += `G01 Z-${currentDepth.toFixed(4)} F${formatFeed(feed / 2)};\n`;
    }
    
    gcode += `G01 ${compensationDirection} D01 X0. Y0. F${formatFeed(feed)};\n`

    // Concentric circles outwards
    let currentRadius = stepover;
    const finalPathRadius = finalRadius - toolRadius;
    while (currentRadius < finalPathRadius) {
      gcode += `G01 X${currentRadius.toFixed(4)} Y0. F${formatFeed(feed)};\n` // move to start of circle
      gcode += `${directionGCode} I-${currentRadius.toFixed(4)} J0. F${formatFeed(feed)};\n`; // full circle
      currentRadius += stepover;
    }

    // Final pass
    gcode += `G01 X${finalPathRadius.toFixed(4)} Y0. F${formatFeed(feed)};\n`;
    gcode += `${directionGCode} I-${finalPathRadius.toFixed(4)} J0. F${formatFeed(feed)};\n`;

    gcode += `G01 G40 X0. Y0. F${formatFeed(feed)};\n` // Return to center, cancel compensation
  }
  
  gcode += `G00 Z1.0;\n`;
  gcode += `M05;\n`;
  gcode += `G91 G28 Z0;\n`;
  gcode += `G91 G28 X0 Y0;\n`;
  gcode += `G90;\n`;
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
      totalDepthOfCut: 0.5,
      depthPerPass: 0.25,
      stepover: 0.2,
      millingDirection: 'climb',
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
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline text-primary">
          <Cog className="text-accent" />
          <span>Circular Interpolation</span>
        </CardTitle>
        <CardDescription>
          Enter parameters to generate G-code for milling a circular pocket.
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
                name="totalDepthOfCut"
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
                name="depthPerPass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depth per Pass (in)</FormLabel>
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
               <FormField
                    control={form.control}
                    name="millingDirection"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Milling Direction</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="climb" />
                                </FormControl>
                                <FormLabel className="font-normal">Climb</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="conventional" />
                                </FormControl>
                                <FormLabel className="font-normal">Conventional</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <Button size="lg" type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
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
              <div className="relative rounded-md bg-secondary/80 p-4 font-code text-sm group">
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
