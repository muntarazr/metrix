export const DANGEROUS_KEYWORDS = [
  "suicide",
  "kill myself",
  "harm myself",
  "end my life",
  "bomb",
  "explosive",
  "detonate",
  "shrapnel",
  "murder",
  "assassinate",
  "kill people",
  "terrorist",
  "terrorism",
  "steal credit card",
  "carding",
  "fraud",
  "manufacture weapon",
  "build gun",
  "child porn",
  "abuse children",
  // Arabic safety keywords
  "انتحار",
  "قتل نفسي",
  "إيذاء نفسي",
  "إنهاء حياتي",
  "قنبلة",
  "متفجرات",
  "تفجير",
  "شظايا",
  "قتل",
  "اغتيال",
  "إرهاب",
  "سرقة بطاقة",
  "صنع سلاح",
  "سلاح",
  "أسلحة",
];

export interface SafetyCheck {
  isSafe: boolean;
  reason?: string;
}

export function detectLanguage(text: string): "ar" | "en" {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? "ar" : "en";
}

export function checkContentSafety(text: string): SafetyCheck {
  const lower = text.toLowerCase();
  for (const kw of DANGEROUS_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        isSafe: false,
        reason: "Safety Policy Violation: Request contains prohibited content.",
      };
    }
  }
  return { isSafe: true };
}
