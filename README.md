# CNC Machinist Mate

This is a Next.js application designed to provide useful tools for CNC machinists. The initial feature is an AI-powered G-code generator for circular interpolation on a Haas CNC mill.

## Features

-   **Parameter Input**: Enter parameters for circular interpolation.
-   **AI G-Code Generation**: The app uses a GenAI flow to generate G-code that is validated against safety and machine constraints.
-   **Copy to Clipboard**: Easily copy the generated G-code with a single click.

## Tech Stack

-   [Next.js](https://nextjs.org/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [Shadcn/ui](https://ui.shadcn.com/)
-   [Genkit](https://firebase.google.com/docs/genkit)

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
