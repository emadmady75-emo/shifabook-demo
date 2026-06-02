import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { BookingProvider } from "@/components/BookingContext";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "ShifaBook (شفاء بوك) | حجز موعد عيادة فوري في 30 ثانية",
  description: "أسرع نظام لحجز مواعيد العيادات الطبية بالشرق الأوسط. اختر موعدك بأسلوب خريطة الطائرة وأدخل اسمك وهاتفك لتأكيد الحجز فوراً بدون حسابات معقدة.",
  keywords: ["حجز مواعيد", "عيادات الرياض", "شفاء بوك", "أحمد العتيبي", "طبيب قلب", "عيادة فورية", "نظام حجز مواعيد"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} scroll-smooth`}>
      <body className="font-sans antialiased min-h-screen bg-[#070e12] text-slate-100 flex flex-col selection:bg-teal-500/30 selection:text-teal-200">
        <BookingProvider>
          {children}
        </BookingProvider>
      </body>
    </html>
  );
}
