import { Poppins } from "next/font/google";
import "./globals.css";
import HydrationProvider from "./components/HydrationProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "GeofenceHRM - Smart HR Management System",
  description:
    "Advanced HR Management System with geofencing, attendance tracking, and employee management features.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <HydrationProvider>{children}</HydrationProvider>
      </body>
    </html>
  );
}
