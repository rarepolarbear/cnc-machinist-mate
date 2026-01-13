
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clipboard, Cog, Check, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const formSchema = z.object({
  threadMillDiameter: z.coerce.number().positive(),
  threadsPerInch: z.coerce.number().positive(),
  minorDiameter: z.coerce.number().positive(),
  majorDiameter: z.coerce.number().positive(),
  threadDepth: z.coerce.number().positive(),
  speed: z.coerce.number().int().positive(),
  feed: z.coerce.number().positive(),
  hand: z.enum(['rh', 'lh']),
  rPlane: z.coerce.number().positive('Must be positive.'),
  toolNumber: z.coerce.number().int().positive('Must be a positive integer.'),
  radialPasses: z.coerce.number().int().min(1).max(5),
}).refine(data => data.majorDiameter > data.minorDiameter, {
    message: "Major diameter must be larger than minor diameter.",
    path: ["majorDiameter"],
})

type FormValues = z.infer<typeof formSchema>

function generateGCode(data: FormValues): string {
  const {
    threadMillDiameter,
    threadsPerInch,
    minorDiameter,
    majorDiameter,
    threadDepth,
    speed,
    feed,
    hand,
    rPlane,
    toolNumber,
    radialPasses,
  } = data

  const toolRadius = threadMillDiameter / 2
  const majorRadius = majorDiameter / 2
  const threadPitch = 1 / threadsPerInch
  
  const pathRadius = majorRadius - toolRadius

  const helicalDirection = hand === 'rh' ? 'G03' : 'G02'
  const compensationDirection = hand === 'rh' ? 'G41' : 'G42'
  const passes = radialPasses || 1
  const radialCutAmount = toolRadius
  // Nominal radial step limit (default 1). Ensure per-pass radial step magnitude
  // does not exceed this value.
  const nominalRadialStep = 1
  const maxStep = Math.abs(nominalRadialStep)
  let radialStep = radialCutAmount / passes
  radialStep = Math.min(Math.abs(radialStep), maxStep)
  // I parameter per helical move: absolute nominal radial step divided by number of passes
  const iValue = Math.abs(pathRadius) / passes
  
  const zBottom = -threadDepth

  const formatFeed = (f: number) => Number.isInteger(f) ? `${f}.` : f.toString()

  let gcode = `(Thread Milling G-Code - ${hand === 'rh' ? 'Right Hand' : 'Left Hand'})\n`
  gcode += `(Major Dia: ${majorDiameter}, TPI: ${threadsPerInch})\n`
  gcode += `G20 (INCH MODE)\n`
  gcode += `G90 G17 G40 G80\n`
  gcode += `T${toolNumber} M06 (SELECT TOOL ${toolNumber})\n`
  gcode += `G54 S${speed} M03\n`
  gcode += `G0 X0. Y0.\n` 
  gcode += `G43 Z${rPlane} H${toolNumber} M08\n`
  
  gcode += `G01 Z${zBottom.toFixed(4)} F${formatFeed(feed)}\n`

  gcode += `G91\n`

  // Build radii for each radial pass, then sort by absolute value ascending so the
  // smallest I (smallest absolute radius) is generated first to ensure the tool
  // "steps in" correctly.
  // Use absolute radii (distance from center) and sort ascending so the
  // smallest radial distance is executed first.
  const radii = Array.from({ length: passes }, (_, i) => Math.abs(pathRadius - i * radialStep))
  radii.sort((a, b) => a - b)

  radii.forEach((thisRadius, idx) => {
    gcode += `(Pass ${idx + 1})\n`
    gcode += `G01 ${compensationDirection} D${toolNumber} X${thisRadius.toFixed(4)} Y0. F${formatFeed(feed)}\n`

    let currentThreadZ = 0
    while (currentThreadZ < threadDepth) {
      const zMove = Math.min(threadPitch, threadDepth - currentThreadZ)
      gcode += `${helicalDirection} X0. Y0. Z${zMove.toFixed(4)} I-${iValue.toFixed(4)} J0. F${formatFeed(feed)}\n`
      currentThreadZ += zMove
    }

    gcode += `G01 G40 X-${thisRadius.toFixed(4)} Y0.\n`
  })

  gcode += `G90\n`
  
  gcode += `G00 Z${rPlane}\n`
  gcode += `M05\n`
  gcode += `M09\n`
  gcode += `G91 G28 Z0\n`
  gcode += `G91 G28 X0 Y0\n`
  gcode += `G90\n`
  gcode += `M30\n`

  return gcode
}

export function ThreadMillGenerator() {
  const [gCode, setGCode] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      threadMillDiameter: 0.4,
      threadsPerInch: 20,
      minorDiameter: 0.4375,
      majorDiameter: 0.5,
      threadDepth: 0.5,
      speed: 4000,
      feed: 15.0,
      hand: 'rh',
      rPlane: 0.1,
      toolNumber: 1,
      radialPasses: 1,
    },
  })

  function onSubmit(values: FormValues) {
    const generatedCode = generateGCode(values)
    setGCode(generatedCode)
  }

  const handleCopy = () => {
    if (gCode) {
      navigator.clipboard.writeText(gCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-headline text-primary">
          <Cog className="text-accent" />
          <span>Thread Milling</span>
        </CardTitle>
        <CardDescription>
          Enter parameters to generate G-code for milling internal threads.
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
                name="threadsPerInch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threads Per Inch (TPI)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
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
                     <FormDescription>
                      This is the pre-drilled hole size.
                    </FormDescription>
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
              <FormField
                control={form.control}
                name="rPlane"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>R Plane (Z Start Distance)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Defaults to Z0.1.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toolNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Number</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Changes T and H numbers (e.g., T1 H1).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="radialPasses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Radial Passes</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        defaultValue={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Number of radial passes (1-5). Default 1.</FormDescription>
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
  )
}
