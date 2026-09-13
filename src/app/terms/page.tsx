"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  applyDocumentLanguage,
  readStoredLanguage,
} from "@/lib/language";
import type { Language } from "@/lib/translations";

/**
 * DRAFT legal copy — not yet reviewed by counsel. See src/app/privacy/page.tsx
 * for the same caveats. Public route, allowlisted in src/proxy.ts.
 */
export default function TermsPage() {
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    const stored = readStoredLanguage();
    queueMicrotask(() => setLanguage(stored));
  }, []);

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  const isArabic = language === "ar";

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto max-w-2xl px-6 py-16 text-foreground"
    >
      <Link href="/" className="text-sm text-primary underline">
        {isArabic ? "العودة إلى METRIX" : "Back to METRIX"}
      </Link>

      <h1 className="mt-6 text-2xl font-bold">
        {isArabic ? "شروط الاستخدام" : "Terms of Use"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isArabic ? "آخر تحديث: 2026-09-04 (نسخة مبدئية)" : "Last updated: 2026-09-04 (draft)"}
      </p>

      {isArabic ? (
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg">طبيعة الخدمة</h2>
            <p className="mt-2 text-sm">
              METRIX أداة لتخطيط الأهداف وتتبعها، تستخدم الذكاء الاصطناعي لتوليد خطط وتقييم تقدمك. النتائج والتقييمات مساعدة وليست استشارة طبية أو نفسية أو مالية.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">حسابك</h2>
            <p className="mt-2 text-sm">
              أنت مسؤول عن أمان حسابك وصحة المعلومات التي تُدخلها. يمكنك حذف حسابك في أي وقت.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">الاستخدام العادل لخدمات الذكاء الاصطناعي</h2>
            <p className="mt-2 text-sm">
              للحفاظ على استقرار الخدمة لجميع المستخدمين، تُطبَّق حدود استخدام يومية لعدد طلبات الذكاء الاصطناعي والتفريغ الصوتي لكل مستخدم.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">التحديات (Challenges)</h2>
            <p className="mt-2 text-sm">
              عند مشاركتك في تحدٍ مع مستخدم آخر، يظهر لخصمك عنوان هدفك وتقدمك بالنقاط فقط، وليس تفاصيل تسجيلاتك الخاصة.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">التواصل</h2>
            <p className="mt-2 text-sm">
              لأي استفسار: <a className="text-primary underline" href="mailto:muntzr557@gmail.com">muntzr557@gmail.com</a>
            </p>
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg">Nature of the service</h2>
            <p className="mt-2 text-sm">
              METRIX is a goal planning and tracking tool that uses AI to generate plans and evaluate your progress. Its output is assistive, not medical, psychological, or financial advice.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Your account</h2>
            <p className="mt-2 text-sm">
              You are responsible for keeping your account secure and for the accuracy of the information you enter. You may delete your account at any time.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Fair use of AI features</h2>
            <p className="mt-2 text-sm">
              To keep the service stable for everyone, daily limits apply per user to AI plan/evaluation requests and voice transcription.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Challenges</h2>
            <p className="mt-2 text-sm">
              When you join a challenge with another user, your opponent sees your goal title and point progress only — not your private log entries.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Contact</h2>
            <p className="mt-2 text-sm">
              For any question: <a className="text-primary underline" href="mailto:muntzr557@gmail.com">muntzr557@gmail.com</a>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
