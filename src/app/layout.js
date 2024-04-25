import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Weatherlist",
  description: "Spotify Application to create playlists based on your location's current weather and listening data",
  viewport: 'width=device-width, initial-scale=1.0, user-scalable=no'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
