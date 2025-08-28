
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Clipboard,
  Cog,
  Check,
  Zap,
} from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'

const formSchema = z.object({
  speed: z.coerce.number().int().positive('Must be a positive integer.'),
  feed: z.coerce.number().positive('Must be positive.'),
  toolNumber: z.coerce.number().int().positive('Must be a positive integer.'),
  holeDiameter: z.coerce.number().positive('Must be positive.'),
  peckAmount: z.coerce.number().positive('Must be positive.'),
  rPlane: z.coerce.number().positive('Must be positive.'),
  totalDepth: z.coerce.number().positive('Must be positive.'),
  coolant: z.enum(['on', 'off']),
})

type FormValues = z.infer<typeof formSchema>

function generateGCode(data: FormValues): string {
  const { speed, feed, toolNumber, holeDiameter, peckAmount, rPlane, totalDepth, coolant } = data

  const formatFeed = (f: number) => Number.isInteger(f) ? `${f}.` : f.toString()

  let gcode = `(Drilling Cycle - G83)
`
  gcode += `(Hole Dia: ${holeDiameter})
`
  gcode += `G90 G17 G20 G40 G80
`
  gcode += `T${toolNumber} M06 (SELECT TOOL ${toolNumber})
`
  gcode += `G54
`
  gcode += `M03 S${speed}
`
  if (coolant === 'on') {
    gcode += `M08
`
  }
  gcode += `G00 X0. Y0.
`
  gcode += `G43 H${toolNumber} Z${rPlane}
`
  gcode += `G83 Z-${totalDepth.toFixed(4)} Q${peckAmount.toFixed(4)} R${rPlane.toFixed(4)} F${formatFeed(feed)}
`
  gcode += `G80
`
  gcode += `G00 Z1.0
`
  if (coolant === 'on') {
    gcode += `M09
`
  }
  gcode += `M05
`
  gcode += `G91 G28 Z0
`
  gcode += `G91 G28 X0 Y0
`
  gcode += `G90
`
  gcode += `M30
`

  return gcode
}

export function DrillingGenerator() {
  const [gCode, setGCode] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      speed: 1500,
      feed: 10.0,
      toolNumber: 2,
      holeDiameter: 0.25,
      peckAmount: 0.1,
      rPlane: 0.1,
      totalDepth: 0.5,
      coolant: 'on',
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
          <span>Drilling Cycle</span>
        </CardTitle>
        <CardDescription>
          Enter parameters to generate G-code for a peck drilling cycle (G83).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                name="toolNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Number</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Changes T and H numbers (e.g., T2 H2).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="holeDiameter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hole Diameter (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Depth (in)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="peckAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peck Amount (Q value)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                     <FormDescription>
                      Incremental depth per peck.
                    </FormDescription>
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
                name="coolant"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Coolant</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="on" />
                          </FormControl>
                          <FormLabel className="font-normal">On</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="off" />
                          </FormControl>
                          <FormLabel className="font-normal">Off</FormLabel>
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
  )
}
