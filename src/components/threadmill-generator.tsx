'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clipboard, Cog, Check, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  radialSteps: z.coerce.number().int().min(1).max(5).default(1),
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
    radialSteps,
  } = data

  const toolRadius = threadMillDiameter / 2
  const majorRadius = majorDiameter / 2
  const threadPitch = 1 / threadsPerInch
  
  // This is the final target radius offset
  const totalPathRadius = majorRadius - toolRadius

  const helicalDirection = hand === 'rh' ? 'G03' : 'G02' 
  const compensationDirection = hand === 'rh' ? 'G41' : 'G42'
  
  const zBottom = -threadDepth

  const formatFeed = (f: number) => Number.isInteger(f) ? `${f}.` : f.toString()

  let gcode = `(Thread Milling G-Code - ${hand === 'rh' ? 'Right Hand' : 'Left Hand'})\n`
  gcode += `(Major Dia: ${majorDiameter}, TPI: ${threadsPerInch})\n`
  gcode += `(Radial Steps: ${radialSteps})\n`
  gcode += `G20 (INCH MODE)\n`
  gcode += `G90 G17 G40 G80\n`
  gcode += `T${toolNumber} M06 (SELECT TOOL ${toolNumber})\n`
  gcode += `G54 S${speed} M03\n`
  gcode += `G0 X0. Y0.\n` 
  gcode += `G43 Z${rPlane} H${toolNumber} M08\n`
  
  // Iterate through the number of radial steps
  for (let step = 1; step <= radialSteps; step++) {
    
    // Calculate the I value for this specific step
    // Example: If total I is 0.0625 and step is 1 of 3: (0.0625 * 1) / 3 = 0.0208
    const currentStepRadius = (totalPathRadius * step) / radialSteps
    const currentI = currentStepRadius.toFixed(4)

    gcode += `\n(--- Pass ${step} of ${radialSteps} | Cut Radius: ${currentI} ---)\n`

    // Move to bottom of hole (Absolute)
    // We do this every pass to ensure we start the spiral from the bottom
    gcode += `G90 G01 Z${zBottom.toFixed(4)} F${formatFeed(feed)}\n`

    // Switch to Incremental for the helical move
    gcode += `G91\n`

    // Lead In: Move X by current step radius
    gcode += `G01 ${compensationDirection} D${toolNumber} X${currentI} Y0. F${formatFeed(feed)}\n`
      
    // Spiral Up Logic
    let currentThreadZ = 0
    while(currentThreadZ < threadDepth) {
        const zMove = Math.min(threadPitch, threadDepth)
        // Note: I value changes based on the current step radius
        gcode += `${helicalDirection} X0. Y0. Z${zMove.toFixed(4)} I-${currentI} J0. F${formatFeed(feed)}\n`
        currentThreadZ += zMove
    }
    
    // Lead Out: Return to center (X0 relative to hole center)
    gcode += `G01 G40 X-${currentI} Y0.\n`
  }

  // Final Cleanup
  gcode += `\nG90\n`
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
      radialSteps: 1,
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
                name="radialSteps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Radial Steps</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select steps" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Step (Full Depth)</SelectItem>
                        <SelectItem value="2">2 Steps</SelectItem>
                        <SelectItem value="3">3 Steps</SelectItem>
                        <SelectItem value="4">4 Steps</SelectItem>
                        <SelectItem value="5">5 Steps</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Increases path radius incrementally.
                    </FormDescription>
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
                    <FormLabel>R Plane (Z Start)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
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
