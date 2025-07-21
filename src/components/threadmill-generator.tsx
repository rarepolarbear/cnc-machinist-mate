'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clipboard, Cog, Check, Zap } from 'lucide-react';

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
  threadMillDiameter: z.coerce.number().positive(),
  threadPitch: z.coerce.number().positive(),
  minorDiameter: z.coerce.number().positive(),
  majorDiameter: z.coerce.number().positive(),
  threadDepth: z.coerce.number().positive(),
  speed: z.coerce.number().int().positive(),
  feed: z.coerce.number().positive(),
  hand: z.enum(['rh', 'lh']),
}).refine(data => data.majorDiameter > data.minorDiameter, {
    message: "Major diameter must be larger than minor diameter.",
    path: ["majorDiameter"],
});

type FormValues = z.infer<typeof formSchema>;

function generateGCode(data: FormValues): string {
  const {
    threadMillDiameter,
    threadPitch,
    minorDiameter,
    majorDiameter,
    threadDepth,
    speed,
    feed,
    hand,
  } = data;

  const toolRadius = threadMillDiameter / 2;
  const majorRadius = majorDiameter / 2;
  
  // For internal threads, the tool path radius is the hole's major radius minus the tool's radius
  const pathRadius = majorRadius - toolRadius;
  const helicalDirection = hand === 'rh' ? 'G02' : 'G03'; // G02 for RH (CW), G03 for LH (CCW)
  const compensationDirection = hand === 'rh' ? 'G41' : 'G42'; // G41 for RH (Left comp), G42 for LH (Right comp)
  const zIncrement = threadPitch;

  let gcode = `(Thread Milling G-Code - ${hand === 'rh' ? 'Right Hand' : 'Left Hand'})\n`;
  gcode += `(Major Dia: ${majorDiameter}, Pitch: ${threadPitch})\n`;
  gcode += `G90 G17 G20 G40 G80;\n`;
  gcode += `T1 M06 (SELECT TOOL 1);\n`;
  gcode += `G54;\n`;
  gcode += `M03 S${speed};\n`;
  gcode += `G00 X0. Y0.;\n`; // Move to center of the hole
  gcode += `G43 H01 Z0.1;\n`;
  
  // Rapid to a safe Z above the start depth
  gcode += `G00 Z-${(threadDepth - zIncrement).toFixed(4)};\n`;
  
  // Position at hole center at depth
  gcode += `G01 Z-${threadDepth.toFixed(4)} F${feed / 2};\n`;
  
  // Cutter compensation on, move to start of helix
  gcode += `${compensationDirection} D01 X${pathRadius.toFixed(4)} Y0. F${feed};\n`;
  
  // Helical move up to create the thread
  gcode += `G91; (Incremental mode)\n`;
  gcode += `${helicalDirection} I-${pathRadius.toFixed(4)} J0. Z${zIncrement.toFixed(4)} F${feed};\n`;
  gcode += `G90; (Absolute mode)\n`;

  // Retract from wall and cancel compensation
  gcode += `G01 G40 X0. Y0.;\n`;

  // Rapid retract out of the hole
  gcode += `G00 Z1.0;\n`;
  gcode += `M05;\n`;
  gcode += `G91 G28 Z0;\n`;
  gcode += `G91 G28 X0 Y0;\n`;
  gcode += `M30;\n`;

  return gcode;
}

export function ThreadMillGenerator() {
  const [gCode, setGCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      threadMillDiameter: 0.4,
      threadPitch: 1 / 20, // 20 TPI
      minorDiameter: 0.4375, // 7/16
      majorDiameter: 0.5, // 1/2-20
      threadDepth: 0.5,
      speed: 4000,
      feed: 15.0,
      hand: 'rh',
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
          <span>Thread Milling</span>
        </CardTitle>
        <CardDescription>
          Enter your parameters to generate G-code for milling internal threads on a Haas CNC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="threadMillDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threadmill Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="threadPitch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread Pitch (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minorDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minor Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="majorDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Major Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="threadDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depth of Threads (in)</FormLabel>
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
                    name="hand"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Thread Hand</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="rh" />
                                </FormControl>
                                <FormLabel className="font-normal">Right Hand</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="lh" />
                                </FormControl>
                                <FormLabel className="font-normal">Left Hand</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
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
