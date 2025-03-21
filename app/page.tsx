'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center font-[family-name:var(--font-geist-sans)] bg-gradient-to-br from-blue-200 via-purple-100 to-indigo-300 animate-gradient-xy">
      <main className="flex flex-col items-center justify-center max-w-3xl mx-auto px-4 py-4 sm:px-10 sm:py-8 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.44)' }}>
      <div className="text-center flex flex-col items-center justify-center">
      <DotLottieReact
        src="https://lottie.host/0ff3602d-4f3d-4d95-8295-280f04bfd116/M4GcRhCBp4.lottie"
        loop
        autoplay
        className="w-full max-w-[500px] mx-auto"
      />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-balance text-gray-900 sm:text-5xl">
          Sitio web en construcción
          </h1>
          <p className="mt-4 text-lg font-medium text-pretty text-gray-700 sm:text-xl/8">
          Estamos trabajando para traerte una mejor experiencia.
          </p>
          <div className="flex items-center justify-center gap-x-6">
          </div>
        </div>
      </main>
    </div>
  );
}
