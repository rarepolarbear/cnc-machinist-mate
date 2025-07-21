import { GCodeGenerator } from '@/components/gcode-generator';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            CNC Machinist Mate
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl mx-auto">
            Generate G-code for circular interpolation on a Haas CNC mill with AI-powered safety checks.
          </p>
        </header>
        <GCodeGenerator />
      </div>
    </main>
  );
}
