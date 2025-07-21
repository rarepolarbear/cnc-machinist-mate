import { GCodeGenerator } from '@/components/gcode-generator';
import { ThreadMillGenerator } from '@/components/threadmill-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            CNC Machinist Mate
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl mx-auto">
            Your assistant for everyday CNC tasks. Select a tool to get started.
          </p>
        </header>
        <Tabs defaultValue="circular-interpolation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="circular-interpolation">Circular Interpolation</TabsTrigger>
            <TabsTrigger value="thread-milling">Thread Milling</TabsTrigger>
          </TabsList>
          <TabsContent value="circular-interpolation">
            <GCodeGenerator />
          </TabsContent>
          <TabsContent value="thread-milling">
            <ThreadMillGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
