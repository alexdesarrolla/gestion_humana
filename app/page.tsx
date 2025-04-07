'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center font-[family-name:var(--font-geist-sans)] bg-gradient-to-br from-[#fff9eb] to-[#fdedc8] animate-gradient-xy">
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
          <div className="flex items-center justify-center gap-x-6 mt-6">
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#6B487A] text-white hover:bg-black/90 h-11 px-6"
            >
              Ingresar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
