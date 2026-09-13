"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  applyDocumentLanguage,
  readStoredLanguage,
} from "@/lib/language";
import type { Language } from "@/lib/translations";

/**
 * DRAFT legal copy — not yet reviewed by counsel. Ships so METRIX has a real
 * disclosure of what happens to a user's goal, voice and image data before
 * any public launch. Update the "آخر تحديث" / "Last updated" date whenever
 * the content changes, and replace the placeholder contact email if it goes
 * out of date.
 *
 * Public route: added to the allowlist in src/proxy.ts so a signed-out
 * visitor can read it without being bounced to /login.
 */
export default function PrivacyPolicyPage() {
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
        {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isArabic ? "آخر تحديث: 2026-09-04 (نسخة مبدئية)" : "Last updated: 2026-09-04 (draft)"}
      </p>

      {isArabic ? (
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg">ما هي البيانات التي نجمعها</h2>
            <p className="mt-2 text-sm">
              حسابك (البريد الإلكتروني عبر Google)، أهدافك ومهامك ونصوص التسجيل اليومي، الملاحظات الصوتية التي تسجّلها، وصور الإنجازات (milestones) التي ترفعها.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">كيف تُستخدم بياناتك مع الذكاء الاصطناعي</h2>
            <p className="mt-2 text-sm">
              نص هدفك وتسجيلاتك اليومية تُرسَل إلى Google Gemini لتوليد الخطة، تقييم تقدمك، وكتابة الملاحظات الأسبوعية. الملاحظات الصوتية تُرسَل إلى Mistral لتفريغها إلى نص. لا نستخدم هذه المزوّدات لأي غرض تسويقي، وهي تعالج طلبك فقط لإرجاع النتيجة لك.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">أين تُخزَّن بياناتك</h2>
            <p className="mt-2 text-sm">
              في قاعدة بيانات Supabase، محمية بصلاحيات وصول تمنع أي مستخدم آخر من رؤية أهدافك أو تسجيلاتك، إلا ما تُظهره صراحةً (مثل العنوان والنقاط) لمن يشاركك تحديًا (Challenge).
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">الاحتفاظ بالصوت والصور</h2>
            <p className="mt-2 text-sm">
              الملاحظات الصوتية تُستخدم لحظيًا للتفريغ إلى نص ولا تُخزَّن على خوادمنا بعد الحصول على النص. صور الإنجازات تبقى مخزنة إلى أن تحذفها أو تحذف حسابك.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">حذف حسابك وبياناتك</h2>
            <p className="mt-2 text-sm">
              يمكنك طلب حذف حسابك وكل بياناتك المرتبطة (الأهداف، السجلات، الصور) عبر التواصل معنا على البريد أدناه. سيُنفَّذ الحذف خلال فترة معقولة وبشكل نهائي.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">التواصل</h2>
            <p className="mt-2 text-sm">
              لأي استفسار يخص خصوصيتك: <a className="text-primary underline" href="mailto:muntzr557@gmail.com">muntzr557@gmail.com</a>
            </p>
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg">What we collect</h2>
            <p className="mt-2 text-sm">
              Your account (email via Google), your goals and tasks, your daily check-in text, voice notes you record, and milestone images you upload.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">How AI providers use your data</h2>
            <p className="mt-2 text-sm">
              Your goal text and daily logs are sent to Google Gemini to generate your plan, evaluate your progress, and write weekly reviews. Voice notes are sent to Mistral for transcription. These providers only process your request to return a result to you; we do not use them for marketing.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Where your data lives</h2>
            <p className="mt-2 text-sm">
              In a Supabase database protected by access policies that prevent other users from seeing your goals or logs, except what you explicitly share (like a title and score) with a Challenge opponent.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Voice and image retention</h2>
            <p className="mt-2 text-sm">
              Voice notes are used momentarily for transcription and are not stored on our servers afterward. Milestone images remain stored until you delete them or delete your account.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Deleting your account and data</h2>
            <p className="mt-2 text-sm">
              You may request deletion of your account and all associated data (goals, logs, images) by contacting us at the email below. Deletion will be completed within a reasonable timeframe and is permanent.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-lg">Contact</h2>
            <p className="mt-2 text-sm">
              For any privacy question: <a className="text-primary underline" href="mailto:muntzr557@gmail.com">muntzr557@gmail.com</a>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
