import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import clsx from "clsx";
import "./globals.css";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "Swift AI Training Platform",
  description: "AI-powered training platform for professionals across financial services, healthcare, and customer service domains.",
  icons: {
    icon: "/favicon.ico"
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Swift AI Training Platform",
    description: "AI-powered training platform for professionals across financial services, healthcare, and customer service domains.",
    siteName: "Swift AI",
    locale: "en_SG",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#001F35", // Darker shade for better contrast
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
          "selection:bg-[#00A9E7]/90 selection:text-white/95"
        )}

        style={{
          background: "linear-gradient(135deg, #001425 0%, #002B49 100%), url(https://files.keyreply.com/files/images/background.svg)",
          backgroundBlendMode: "multiply",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        }}
      >
        
            <div className="relative flex min-h-screen flex-col">
              {/* <header className="w-full bg-yellow-500 text-black text-center p-2 font-semibold">
                Role-Play Training: Referral Skills Evaluation (You are the Financial Advisor)
              </header> */}
              <div className="flex-1">
                <main className="flex flex-col items-center justify-center grow py-6 px-6">
                  <div className="w-full backdrop-blur-md bg-gradient-to-br from-[#002B49]/60 to-[#001425]/70 rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,30,60,0.37)] p-8">
                    {children}
                  </div>
                </main>
              </div>
            </div>
        <Toaster 
          richColors 
          theme="dark" 
          toastOptions={{
            style: {
              background: 'linear-gradient(to right, #001F35, #002B49)',
              color: '#FFFFFF',
              border: '1px solid #FFB800',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: '0.95rem'
            }
          }}
        />
      </body>
    </html>
  );
}
