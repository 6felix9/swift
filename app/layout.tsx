import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import clsx from "clsx";
import "./globals.css";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "Healthier SG Voice Assistant",
  description: "Your trusted partner in Singapore's healthcare system",
  icons: {
    icon: "/favicon.ico"
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Healthier SG Voice Assistant",
    description: "Your trusted partner in Singapore's healthcare system",
    siteName: "Healthier SG",
    locale: "en_SG",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#002B49",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={clsx(
          GeistSans.variable,
          "min-h-screen font-sans antialiased",
          "selection:bg-[#00A9E7] selection:text-white"
        )}
      >
        
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                <main className="flex flex-col items-center justify-center grow py-6 px-6">
                  <div className="w-full backdrop-blur-sm bg-[#002B49]/40 rounded-2xl border border-white/10 shadow-2xl p-8">
                    {children}
                  </div>
                </main>
              </div>
            </div>
        <Toaster 
          richColors 
          theme="system" 
          toastOptions={{
            style: {
              background: '#002B49',
              color: '#FFFFFF',
              border: '1px solid #FFB800'
            }
          }}
        />
      </body>
    </html>
  );
}
