import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "SurveilanceAI - Intelligent Surveillance System",
  description: "AI-powered classroom surveillance and monitoring system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-white antialiased">
        <div className="min-h-screen grid-bg">
          <div className="scanline-overlay" />
          <Sidebar />
          <main className="ml-60 min-h-screen p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
