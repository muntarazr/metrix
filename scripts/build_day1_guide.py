#!/usr/bin/env python3
"""
METRIX Day 1 Interactive Guide Builder (Zero-Prerequisites Edition)
Generates an empathetic, beginner-friendly, visual learning experience with embedded font.
"""

import base64
import os

FONT_PATH = "/Users/wbtio/Desktop/METRIX/MSjawhara-Bold copy.ttf"
OUTPUT_PATH = "/Users/wbtio/Desktop/METRIX/day1_guide.html"

with open(FONT_PATH, "rb") as f:
    font_b64 = base64.b64encode(f.read()).decode("utf-8")

html_template = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>METRIX — دليل اليوم 1: كيف تتحرك البيانات عبر الإنترنت؟ (من الصفر المطلق)</title>
  <style>
    @font-face {
      font-family: 'MSjawhara';
      src: url('./MSjawhara-Bold%20copy.ttf') format('truetype'),
           url('data:font/truetype;charset=utf-8;base64,{{FONT_BASE64}}') format('truetype');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    :root {
      --canvas: #060606;
      --card: #101418;
      --card-hover: #151b22;
      --surface: #171f27;
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(54, 184, 212, 0.35);
      --primary: #36b8d4;
      --primary-dark: #00708d;
      --primary-glow: rgba(54, 184, 212, 0.15);
      --foreground: #f8fafc;
      --muted: #94a3b8;
      --muted-dark: #64748b;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --destructive: #f43f5e;
      --destructive-bg: rgba(244, 63, 94, 0.12);
      --purple: #a855f7;
      --purple-bg: rgba(168, 85, 247, 0.12);
      --radius: 12px;
      --radius-sm: 8px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--canvas);
      color: var(--foreground);
      font-family: 'MSjawhara', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', sans-serif;
      line-height: 1.85;
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      padding-bottom: 80px;
    }

    /* Reading Progress Bar */
    #progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary), #38bdf8);
      width: 0%;
      z-index: 9999;
      transition: width 0.1s ease-out;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Header & Hero */
    header.hero {
      border-bottom: 1px solid var(--border);
      background: radial-gradient(circle at 50% 0%, rgba(54, 184, 212, 0.15) 0%, transparent 70%);
      padding: 44px 0 32px 0;
      margin-bottom: 36px;
    }

    .hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }

    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo-mark {
      width: 38px;
      height: 36px;
      color: var(--primary);
    }

    .brand-name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #ffffff;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--muted);
    }

    .badge-pill.active {
      background: var(--primary-glow);
      border-color: var(--border-accent);
      color: var(--primary);
    }

    .badge-pill.student {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .hero h1 {
      font-size: 32px;
      line-height: 1.35;
      margin-bottom: 12px;
      color: #ffffff;
    }

    .hero p.lead {
      font-size: 17px;
      color: var(--muted);
      max-width: 850px;
      margin-bottom: 24px;
    }

    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      padding: 14px 18px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      color: var(--muted);
    }

    .meta-item strong {
      color: var(--foreground);
    }

    /* Sticky Navigation */
    .sticky-nav {
      position: sticky;
      top: 0;
      background: rgba(6, 6, 6, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 1000;
      border-bottom: 1px solid var(--border);
      padding: 10px 0;
      margin-bottom: 36px;
    }

    .nav-links {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .nav-links::-webkit-scrollbar {
      display: none;
    }

    .nav-link {
      text-decoration: none;
      color: var(--muted);
      font-size: 14px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .nav-link:hover, .nav-link.active {
      color: var(--primary);
      background: var(--surface);
      border-color: var(--border-accent);
    }

    /* Section Styles */
    section.section-block {
      margin-bottom: 48px;
      scroll-margin-top: 80px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    .section-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--primary-glow);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
      transition: border-color 0.2s ease;
    }

    .card:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Empathy Box */
    .empathy-banner {
      background: linear-gradient(135deg, rgba(54, 184, 212, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%);
      border: 1px solid var(--border-accent);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 28px;
    }

    .empathy-banner h3 {
      color: var(--primary);
      font-size: 20px;
      margin-bottom: 10px;
    }

    /* Mental Model Restaurant Grid */
    .model-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }

    .model-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      position: relative;
    }

    .model-badge {
      display: inline-block;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-weight: bold;
    }

    .badge-client { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .badge-server { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge-protocol { background: rgba(16, 185, 129, 0.2); color: #34d399; }

    .model-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .model-desc {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.6;
    }

    /* Code & Terminal Boxes */
    .terminal-box {
      background: #080c10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius);
      overflow: hidden;
      margin: 16px 0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .terminal-header {
      background: #0d1217;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .terminal-dots {
      display: flex;
      gap: 6px;
    }

    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }

    .terminal-title {
      font-size: 13px;
      color: var(--muted);
      font-family: ui-monospace, monospace;
    }

    .copy-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--foreground);
      font-family: 'MSjawhara', sans-serif;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .copy-btn:hover {
      background: var(--primary);
      color: #000000;
      border-color: var(--primary);
    }

    pre.code-block {
      padding: 16px;
      font-family: ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      line-height: 1.65;
      color: #e2e8f0;
      overflow-x: auto;
      direction: ltr;
      text-align: left;
    }

    /* Interactive Line Dissection */
    .dissection-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .dissection-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 18px;
      transition: all 0.2s ease;
    }

    .dissection-item:hover {
      border-color: var(--border-accent);
      background: var(--card-hover);
    }

    .dissection-code {
      font-family: ui-monospace, monospace;
      color: #38bdf8;
      font-size: 14px;
      direction: ltr;
      text-align: left;
      display: inline-block;
      margin-bottom: 6px;
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .dissection-meaning {
      font-size: 14px;
      color: var(--foreground);
    }

    .dissection-meaning strong {
      color: var(--primary);
    }

    /* CRLF Visual Simulator */
    .crlf-box {
      border: 1px solid var(--border-accent);
      background: #0a1118;
      border-radius: var(--radius);
      padding: 20px;
      margin: 18px 0;
    }

    .crlf-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

    /* REST Rules Comparison */
    .rest-compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    @media (max-width: 640px) {
      .rest-compare { grid-template-columns: 1fr; }
    }

    .compare-card {
      border-radius: var(--radius-sm);
      padding: 16px;
      border: 1px solid;
    }

    .compare-bad {
      background: var(--destructive-bg);
      border-color: rgba(244, 63, 94, 0.3);
    }

    .compare-good {
      background: var(--success-bg);
      border-color: rgba(16, 185, 129, 0.3);
    }

    /* Idempotency Simple Sim */
    .sim-simple-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin: 16px 0;
    }

    .sim-simple-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    /* 4-Step Checklist Roadmap */
    .steps-roadmap {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 20px 0;
    }

    .step-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      position: relative;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .step-num-pill {
      background: var(--primary);
      color: #000000;
      font-weight: bold;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .step-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
    }

    .step-time {
      font-size: 12px;
      color: var(--muted);
      margin-inline-start: auto;
    }

    /* Quiz Component */
    .quiz-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px;
      margin-bottom: 20px;
    }

    .quiz-question {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 14px;
    }

    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .quiz-option {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--foreground);
      transition: all 0.2s ease;
    }

    .quiz-option:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: var(--card-hover);
    }

    .quiz-option.correct {
      background: var(--success-bg) !important;
      border-color: var(--success) !important;
      color: #a7f3d0 !important;
    }

    .quiz-option.incorrect {
      background: var(--destructive-bg) !important;
      border-color: var(--destructive) !important;
      color: #fecdd3 !important;
    }

    .quiz-feedback {
      margin-top: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      display: none;
    }

    /* DoD Checklist */
    .dod-checklist {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .dod-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }

    .dod-item:hover { border-color: var(--border-accent); }

    .dod-item.checked {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .dod-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      border: 2px solid var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dod-item.checked .dod-checkbox {
      background: var(--success);
      border-color: var(--success);
      color: #000;
      font-size: 13px;
    }

    .dod-item.checked .dod-text {
      text-decoration: line-through;
      color: var(--muted);
    }

    .celebration-box {
      display: none;
      margin-top: 20px;
      padding: 20px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(54, 184, 212, 0.2) 100%);
      border: 1px solid var(--success);
      text-align: center;
    }

    /* Master Prompt Callout */
    .prompt-box {
      background: #080d12;
      border: 1px dashed var(--border-accent);
      border-radius: var(--radius);
      padding: 20px;
      margin: 24px 0;
    }
  </style>
</head>
<body>

  <div id="progress-bar"></div>

  <!-- Hero Header -->
  <header class="hero">
    <div class="container">
      <div class="hero-top">
        <div class="brand-lockup">
          <svg class="brand-logo-mark" viewBox="0 0 32 30.254" role="img" aria-label="METRIX">
            <path fill="currentColor" d="M29.025 6.4 L24.786 12.215 C24.738 12.28 24.725 12.364 24.75 12.441 C24.774 12.518 24.834 12.578 24.911 12.603 L31.76 14.831 C31.942 14.891 32.042 15.087 31.983 15.269 L28.919 24.739 C28.891 24.827 28.829 24.899 28.747 24.941 C28.665 24.983 28.57 24.99 28.482 24.962 L21.634 22.734 C21.557 22.709 21.473 22.722 21.407 22.769 C21.342 22.817 21.304 22.893 21.304 22.973 L21.304 29.907 C21.304 30.099 21.148 30.254 20.957 30.254 L11.043 30.254 C10.852 30.254 10.696 30.099 10.696 29.907 L10.696 22.973 C10.696 22.893 10.658 22.817 10.593 22.769 C10.527 22.722 10.443 22.709 10.366 22.734 L3.518 24.962 C3.43 24.99 3.335 24.983 3.253 24.941 C3.171 24.899 3.109 24.827 3.081 24.739 L0.017 15.269 C-0.042 15.087 0.058 14.891 0.24 14.831 L7.089 12.603 C7.166 12.578 7.226 12.518 7.25 12.441 C7.275 12.364 7.262 12.28 7.214 12.215 L2.975 6.4 C2.862 6.245 2.896 6.028 3.051 5.915 L11.071 0.067 C11.146 0.012 11.239 -0.01 11.329 0.004 C11.42 0.019 11.502 0.068 11.556 0.142 L15.795 5.958 C15.843 6.023 15.919 6.062 16 6.062 C16.081 6.062 16.157 6.023 16.205 5.958 L20.444 0.142 C20.498 0.068 20.58 0.019 20.671 0.004 C20.761 -0.01 20.854 0.012 20.929 0.067 L28.949 5.915 C29.104 6.028 29.138 6.245 29.025 6.4 Z M29.025 6.4"/>
          </svg>
          <span class="brand-name">METRIX</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="badge-pill active">المرحلة: اليوم 1 من 45</span>
          <span class="badge-pill student">المستوى: مبتدئ فعلياً (Zero Prerequisites)</span>
          <span class="badge-pill">المدة: 45 - 60 دقيقة</span>
        </div>
      </div>

      <h1>METRIX — دليل اليوم 1: كيف تتحرك البيانات عبر الإنترنت؟</h1>
      <p class="lead">
        الدليل العملي المبسط من الصفر المطلق: انسَ تعقيدات الجامعة النظرية، وشاهد بعينيك كيف يرسل جهازك طلباً نصياً صريحاً، وكيف يرد عليه السيرفر بدقة.
      </p>

      <div class="meta-strip">
        <div class="meta-item">🎯 <strong>المشروع:</strong> METRIX (نظام إدارة الأحداث الذكي)</div>
        <div class="meta-item">👨‍💻 <strong>المتعلم:</strong> منتظر (Muntazar)</div>
        <div class="meta-item">💡 <strong>المنهجية:</strong> النماذج الذهنية البسيطة (Mental Models) + التيرمينال المباشر</div>
      </div>
    </div>
  </header>

  <!-- Navigation -->
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-links">
        <a href="#empathy" class="nav-link active">🧭 ارتاح أولاً</a>
        <a href="#mental-model" class="nav-link">💡 ما هو HTTP؟</a>
        <a href="#dissection" class="nav-link">🔬 تفكيك الطلب</a>
        <a href="#rest-concept" class="nav-link">🏛️ معمارية REST</a>
        <a href="#roadmap" class="nav-link">🚀 الخطة العملية</a>
        <a href="#quiz" class="nav-link">🧠 كويز الفهم</a>
        <a href="#dod" class="nav-link">🏁 معيار الإنجاز</a>
      </div>
    </div>
  </nav>

  <main class="container">

    <!-- Section 1: Empathy & Mindset Reset -->
    <section id="empathy" class="section-block">
      <div class="empathy-banner">
        <h3>🧭 أولاً: لماذا شعرت بالضياع التام عند قراءة الملف السابق؟</h3>
        <p style="font-size: 16px; margin-bottom: 14px;">
          قبل أن نكتب أي سطر كود، يجب أن ترتاح نفسياً من نقطة جوهرية: <strong>شعورك طبيعي 100%، والمشكلة ليست فيك ولا في ذكائك إطلاقاً!</strong>
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px;">
          <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border-right: 3px solid #f87171;">
            <strong style="color: #f87171;">1. فجوة التعليم الجامعي:</strong>
            <p style="font-size: 13.5px; color: var(--muted); margin-top: 6px;">
              في كليات الحاسوب، يُدرّس موضوع الشبكات بنمط نظري مجرد (طبقات OSI السبعة، تعاريف للحفظ مثل "HTTP بروتوكول نقل النص الفائق"). لا أحد يفتح لك التيرمينال ليريك النص الخام وهو يمر عبر الكيبل، ولا كيف يستقبله سيرفر حقيقي في بيئة العمل!
            </p>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border-right: 3px solid #fbbf24;">
            <strong style="color: #fbbf24;">2. صدمة التفاصيل المتقدمة:</strong>
            <p style="font-size: 13.5px; color: var(--muted); margin-top: 6px;">
              الدخول المفاجئ في مصطلحات مثل CRLF و Idempotency و PostgREST دون امتلاك "النموذج الذهني البسيط" لكيفية حركة البيانات، يجعل من المستحيل فهم لماذا وُضعت هذه الأشياء أصلاً!
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Mental Model (Restaurant Analogy) -->
    <section id="mental-model" class="section-block">
      <div class="section-header">
        <div class="section-icon">💡</div>
        <h2 class="section-title">ثانياً: ما هو HTTP؟ (النموذج الذهني من الصفر المطلق)</h2>
      </div>

      <div class="card">
        <p style="margin-bottom: 14px;">
          انسَ كل مصطلحات الكلية لدقيقتين، وتخيل المشهد التالي بكل بساطة:
        </p>
        <p style="font-size: 17px; color: #ffffff; background: var(--surface); padding: 12px 18px; border-radius: 8px; border-right: 4px solid var(--primary); margin-bottom: 16px;">
          أنت جالس في مطعم، وتريد طلب وجبة طعام:
        </p>

        <div class="model-grid">
          <div class="model-card">
            <span class="model-badge badge-client">أنت (الزبون)</span>
            <div class="model-title">العميل (Client)</div>
            <div class="model-desc">
              هو المتصفح الذي تستخدمه، أو تطبيق الموبايل في جيبك، أو حتى كود بايثون بسيط. مهمته: يحدد ماذا يريد ويكتب ورقة الطلب.
            </div>
          </div>

          <div class="model-card">
            <span class="model-badge badge-protocol">النادل (الويتر)</span>
            <div class="model-title">بروتوكول HTTP</div>
            <div class="model-desc">
              هو النادل الذي يأخذ ورقة الطلب منك، يوصلها للمطبخ، ثم يعود إليك حاملاً طبق الطعام المطلوب أو رسالة اعتذار.
            </div>
          </div>

          <div class="model-card">
            <span class="model-badge badge-server">المطبخ</span>
            <div class="model-title">السيرفر (Server)</div>
            <div class="model-desc">
              هو الخادم وقاعدة البيانات التي تحتوي المواد المخزنة. يقرأ ورقة الطلب، يجهز المطلوب، ويسلمه للنادل.
            </div>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <div class="card-title">كيف يتكلم جهازان مع بعضهما؟</div>
          <p style="color: var(--muted); margin-bottom: 12px;">
            الحاسوب لا يملك عيوناً ولا صوتاً. عندما يطلب حاسوبك شيئاً من سيرفر في أمريكا عبر الإنترنت، يفتح <strong>سلكاً نصياً (مقبس اتصال TCP)</strong> ويرسل رسالة نصية عادية جداً تشبه رسائل الواتساب، لكنها مرتبة في <strong>3 أقسام فقط</strong>:
          </p>

          <div class="terminal-box">
            <div class="terminal-header">
              <div class="terminal-dots">
                <span class="terminal-dot dot-red"></span>
                <span class="terminal-dot dot-yellow"></span>
                <span class="terminal-dot dot-green"></span>
              </div>
              <span class="terminal-title">الهيكل الثلاثي لأي طلب في العالم</span>
            </div>
            <pre class="code-block">[القسم الأول: سطر الطلب]       -&gt; أنا شأريد؟ وبأي مكان؟
[القسم الثاني: الترويسات Headers] -&gt; منو أنا؟ وشنو نوع الرسالة؟
--- [سطر فارغ إجباري] ---     -&gt; علامة انتهاء الترويسات!
[القسم الثالث: الجسم Body]        -&gt; الكلام أو البيانات الحقيقية اللي أريد أدزها</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Dissection of HTTP Request -->
    <section id="dissection" class="section-block">
      <div class="section-header">
        <div class="section-icon">🔬</div>
        <h2 class="section-title">ثالثاً: تفكيك طلب الـ HTTP كأنك تقرأ رسالة ورقية</h2>
      </div>

      <div class="card">
        <p style="margin-bottom: 14px;">
          انظر لهذا الطلب الحقيقي الذي يرسله نظام METRIX إلى السيرفر:
        </p>

        <div class="terminal-box">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="terminal-dot dot-red"></span>
              <span class="terminal-dot dot-yellow"></span>
              <span class="terminal-dot dot-green"></span>
            </div>
            <span class="terminal-title">HTTP Request - METRIX Event</span>
            <button class="copy-btn" onclick="copySnippet('http-req-sample')">نسخ</button>
          </div>
          <pre id="http-req-sample" class="code-block"><span style="color: #38bdf8; font-weight: bold;">POST /events HTTP/1.1</span>
<span style="color: #c084fc;">Host: api.metrix.internal</span>
<span style="color: #c084fc;">Authorization: Bearer token123</span>
<span style="color: #c084fc;">Content-Type: application/json</span>

<span style="color: #34d399;">{"title": "user_logged_in"}</span></pre>
        </div>

        <div class="card-title" style="margin-top: 24px;">دعنا نترجمه للغة العربية سطراً بسطر:</div>

        <div class="dissection-list">
          <div class="dissection-item">
            <div class="dissection-code">1. POST /events HTTP/1.1 (سطر الطلب الأول)</div>
            <div class="dissection-meaning">
              • <strong>POST (الفعل/Method):</strong> يعني "أريد أضيف/أنشئ شيء جديد في السيرفر". (لو أردنا فقط قراءة البيانات لكتبنا <code>GET</code>).<br>
              • <strong>/events (المسار/Path):</strong> الصفحة أو المجلد المطلوب في السيرفر، وهنا نقصد قسم "الأحداث".<br>
              • <strong>HTTP/1.1 (اللغة والإصدار):</strong> إعلام السيرفر بإصدار البروتوكول المستخدم.
            </div>
          </div>

          <div class="dissection-item">
            <div class="dissection-code">2. Host: api.metrix.internal</div>
            <div class="dissection-meaning">
              مثل <strong>عنوان البيت المكتوب على الظرف</strong> من الخارج. السيرفر الفيزيائي قد يستضيف 10 مواقع مختلفة، فيعرف بهذا السطر أي موقع تقصد بالضبط.
            </div>
          </div>

          <div class="dissection-item">
            <div class="dissection-code">3. Authorization: Bearer token123</div>
            <div class="dissection-meaning">
              مثل <strong>باج الهوية أو باسوورد الدخول</strong>. السيرفر لا يراك ولا يعرف وجهك، لذا يقرأ هذا السطر ليعرف هل أنت مسموح لك بإضافة بيانات أم لا.
            </div>
          </div>

          <div class="dissection-item">
            <div class="dissection-code">4. Content-Type: application/json</div>
            <div class="dissection-meaning">
              تقول للسيرفر: "البيانات التي بالأسفل مكتوبة بصيغة <strong>JSON</strong>، فلا تعاملها كنص عادي أو صورة أو ملف فيديو، بل فكها كبيانات برمجية".
            </div>
          </div>

          <div class="dissection-item" style="border-right: 4px solid #f59e0b;">
            <div class="dissection-code" style="color: #fbbf24;">5. السطر الفارغ (أهم شيء في البروتوكول!)</div>
            <div class="dissection-meaning">
              السيرفر يقرأ سطراً بسطر. عندما يجد <strong>سطراً فارغاً تماماً</strong>، يعرف فوراً: <em>"انتهت معلومات الهوية والترويسات، والآن سيبدأ الكلام الحقيقي والبيانات"</em>.
            </div>
          </div>

          <div class="dissection-item">
            <div class="dissection-code" style="color: #34d399;">6. {"title": "user_logged_in"} (الـ Body)</div>
            <div class="dissection-meaning">
              هذه هي <strong>المعلومة الحقيقية</strong> التي نريد حفظها في قاعدة بيانات METRIX.
            </div>
          </div>
        </div>

        <!-- Interactive CRLF Experiment -->
        <div class="crlf-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="color: #fbbf24; font-size: 15px;">🔬 تجربة تفاعلية: ماذا يحدث لو نسينا السطر الفارغ؟</strong>
          </div>
          <div class="crlf-controls">
            <button class="sim-btn selected" id="btn-crlf-with" onclick="toggleCrlfSim(true)">مع السطر الفارغ (طبيعي ✅)</button>
            <button class="sim-btn" id="btn-crlf-without" onclick="toggleCrlfSim(false)">حذف السطر الفارغ (كارثة ⚠️)</button>
          </div>
          <div id="crlf-result" class="dissection-meaning" style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 6px; font-family: ui-monospace, monospace; direction: ltr; text-align: left; color: #34d399;">
            [Server Parser Status]: CRLF detected at byte 112 -> Header section closed -> Body parsing started successfully (Status 200 OK).
          </div>
        </div>

      </div>
    </section>

    <!-- Section 4: REST API Architecture -->
    <section id="rest-concept" class="section-block">
      <div class="section-header">
        <div class="section-icon">🏛️</div>
        <h2 class="section-title">رابعاً: ما هي معمارية الـ REST API؟</h2>
      </div>

      <div class="card">
        <p style="margin-bottom: 14px;">
          الـ <strong>API</strong> هو ببساطة طريقة تواصل برمجية بين برنامجين دون شاشة مرئية. وكلمة <strong>REST</strong> ليست برنامجاً ولا لغة، بل هي <strong>"اتيكيت وقواعد ذكية"</strong> اتفق عليها مهندسو البرمجيات في العالم لتجنب الفوضى:
        </p>

        <div class="card-title">القاعدة الأولى: استخدم الأسماء في الروابط وليس الأفعال</div>
        
        <div class="rest-compare">
          <div class="compare-card compare-bad">
            <strong style="color: #f87171;">❌ أسلوب فوضوي (الأفعال في الرابط):</strong>
            <ul style="padding-inline-start: 18px; margin-top: 8px; font-size: 14px; color: #fecdd3;">
              <li><code>POST /createNewEvent</code></li>
              <li><code>GET /getAllEvents</code></li>
              <li><code>GET /deleteEvent?id=5</code></li>
            </ul>
          </div>

          <div class="compare-card compare-good">
            <strong style="color: #34d399;">✅ أسلوب RESTful المنظم (الاسم في الرابط والفعل في الـ Method):</strong>
            <ul style="padding-inline-start: 18px; margin-top: 8px; font-size: 14px; color: #a7f3d0;">
              <li><code>GET /events</code> &rarr; اقرأ لي الأحداث</li>
              <li><code>POST /events</code> &rarr; أنشئ حدثاً جديداً</li>
              <li><code>DELETE /events/5</code> &rarr; احذف الحدث رقم 5</li>
            </ul>
          </div>
        </div>

        <div style="margin-top: 28px;">
          <div class="card-title">القاعدة الثانية: مفهوم الـ Idempotency (الحيادية)</div>
          <p style="color: var(--muted); margin-bottom: 12px;">
            كلمة تبدو صعبة ومخيفة، لكن معناها في الواقع تافه وبسيط جداً:
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: var(--surface); padding: 16px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color: #34d399;">عملية حيادية (Idempotent):</strong>
              <p style="font-size: 13.5px; color: var(--muted); margin-top: 6px;">
                لو ضغطت الزر <strong>10 مرات متتالية بالغلط</strong>، لا يحدث خراب في قاعدة البيانات (مثل <code>GET</code> لقراءة صفحة، أو <code>DELETE</code> لحذف عنصر). بعد أول حذف، العنصر يختفي وتكرار الحذف لن يغير شيئاً.
              </p>
            </div>
            <div style="background: var(--surface); padding: 16px; border-radius: 8px; border-left: 3px solid #f87171;">
              <strong style="color: #f87171;">عملية غير حيادية (Non-Idempotent):</strong>
              <p style="font-size: 13.5px; color: var(--muted); margin-top: 6px;">
                لو كررتها تحدث مشكلة حقيقية! مثل <code>POST</code> لإرسال دفعة مالية أو تسجيل حدث؛ لو ضغطت مرتين، قد تُسحب الفلوس مرتين أو يتكرر السجل مرتين في الداتابيس.
              </p>
            </div>
          </div>

          <!-- Mini Sandbox -->
          <div class="sim-simple-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <strong style="color: #ffffff; font-size: 14px;">🎮 جرب بنفسك: ماذا يحدث لو نقر منتظر الزر مرتين بالغلط؟</strong>
            </div>
            <div class="sim-simple-controls">
              <button class="sim-btn selected" id="simple-post-btn" onclick="runSimpleSim('POST')">تجربة POST /events (غير حيادي)</button>
              <button class="sim-btn" id="simple-del-btn" onclick="runSimpleSim('DELETE')">تجربة DELETE /events/1 (حيادي)</button>
            </div>
            <div id="simple-sim-output" style="background: #080c10; padding: 12px 16px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 13px; direction: ltr; text-align: left; color: #cbd5e1;">
              Click a button above to see what happens in the database.
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Section 5: Roadmap (4 Practical Steps) -->
    <section id="roadmap" class="section-block">
      <div class="section-header">
        <div class="section-icon">🚀</div>
        <h2 class="section-title">خامساً: خطة إنجاز اليوم الأول (4 خطوات عملية في جهازك)</h2>
      </div>

      <div class="card">
        <p style="margin-bottom: 16px;">
          لا تكتفِ بالقراءة، نفّذ هذه الخطوات الأربع بالتحديد على جهازك لإغلاق مهام اليوم 1 والانتقال فوراً لليوم 2:
        </p>

        <div class="steps-roadmap">

          <!-- Step 1 -->
          <div class="step-item">
            <div class="step-header">
              <div class="step-num-pill">1</div>
              <div class="step-title">الفهم المرئي (5 دقائق فقط)</div>
              <div class="step-time">⏱️ 5 دقائق</div>
            </div>
            <p style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
              شاهد هذا المقطع المركز من قناة <strong>ByteByteGo</strong>:
            </p>
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <a href="https://www.youtube.com/results?search_query=What+Is+REST+API+ByteByteGo" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #dc2626; color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                ▶ مشاهدة المقطع: What Is REST API? - ByteByteGo
              </a>
              <span style="font-size: 13px; color: var(--muted);">ركز على أول 3 دقائق (شكل الطلب Request وأكواد الرد).</span>
            </div>
            <div style="margin-top: 12px; background: var(--card); padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #e2e8f0;">
              💡 <strong>قاعدة الأكواد السريعة:</strong> <span style="color: #34d399;">200 تعني تم بنجاح</span> | <span style="color: #fbbf24;">400 تعني خطأ في طلبك</span> | <span style="color: #f87171;">500 تعني السيرفر معطل</span>.
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step-item">
            <div class="step-header">
              <div class="step-num-pill">2</div>
              <div class="step-title">رؤية الحزمة الحقيقية بالتيرمينال (10 دقائق)</div>
              <div class="step-time">⏱️ 10 دقائق</div>
            </div>
            <p style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
              افتح الـ Terminal على جهازك، وانسخ هذا الأمر تماماً كما هو واضغط Enter:
            </p>

            <div class="terminal-box">
              <div class="terminal-header">
                <div class="terminal-dots">
                  <span class="terminal-dot dot-red"></span>
                  <span class="terminal-dot dot-yellow"></span>
                  <span class="terminal-dot dot-green"></span>
                </div>
                <span class="terminal-title">Terminal cURL Command</span>
                <button class="copy-btn" onclick="copySnippet('muntazar-curl')">نسخ الأمر</button>
              </div>
              <pre id="muntazar-curl" class="code-block">curl -v -X POST "https://httpbin.org/post" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token_123" \
  -d '{"student": "Muntazar", "day": 1}'</pre>
            </div>

            <div style="background: var(--card); padding: 12px 16px; border-radius: 8px; font-size: 13.5px; margin-top: 10px;">
              <strong style="color: var(--primary);">كيف تقرأ ما يظهر على الشاشة؟</strong>
              <ul style="padding-inline-start: 20px; margin-top: 6px; color: var(--muted); line-height: 1.8;">
                <li>• أي سطر يبدأ بـ <code>&gt;</code> هو ما أرسله حاسوبك (الطلب + الترويسات + الـ Body).</li>
                <li>• أي سطر يبدأ بـ <code>&lt;</code> هو رد السيرفر (كود 200 OK والترويسات الخاصة به).</li>
                <li>• السطور في النهاية بين الأقواس المعقوفة <code>{ ... }</code> هي البيانات التي فهمها السيرفر ورجعها لك للتأكيد.</li>
              </ul>
            </div>

            <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 13px; color: var(--muted);">أو شغل السكربت الجاهز الذي بنيناه لك:</span>
              <code style="background: #000; padding: 4px 10px; border-radius: 4px; color: #34d399; direction: ltr;">bash api-tests/day1-curl-test.sh</code>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="step-item">
            <div class="step-header">
              <div class="step-num-pill">3</div>
              <div class="step-title">تهيئة مجلد المشروع على حاسوبك (5 دقائق)</div>
              <div class="step-time">⏱️ 5 دقائق</div>
            </div>
            <p style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
              في التيرمينال نفسه، أنشئ مجلد اليوم الأول لمشروع METRIX:
            </p>

            <div class="terminal-box">
              <div class="terminal-header">
                <div class="terminal-dots">
                  <span class="terminal-dot dot-red"></span>
                  <span class="terminal-dot dot-yellow"></span>
                  <span class="terminal-dot dot-green"></span>
                </div>
                <span class="terminal-title">Bash Setup</span>
                <button class="copy-btn" onclick="copySnippet('step3-code')">نسخ</button>
              </div>
              <pre id="step3-code" class="code-block">mkdir -p ~/Desktop/METRIX/day1
cd ~/Desktop/METRIX/day1
git init</pre>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="step-item">
            <div class="step-header">
              <div class="step-num-pill">4</div>
              <div class="step-title">إنشاء ملف البيئة .env.local (5 دقائق)</div>
              <div class="step-time">⏱️ 5 دقائق</div>
            </div>
            <p style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
              أنشئ ملفاً لحفظ مفاتيح الربط التي سنستخدمها غداً:
            </p>

            <div class="terminal-box">
              <div class="terminal-header">
                <div class="terminal-dots">
                  <span class="terminal-dot dot-red"></span>
                  <span class="terminal-dot dot-yellow"></span>
                  <span class="terminal-dot dot-green"></span>
                </div>
                <span class="terminal-title">.env.local setup</span>
                <button class="copy-btn" onclick="copySnippet('step4-code')">نسخ</button>
              </div>
              <pre id="step4-code" class="code-block">cat &lt;&lt; 'EOF' &gt; .env.local
PROJECT_NAME="METRIX"
API_VERSION="v1"
ENVIRONMENT="development"
EOF</pre>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Section 6: Quiz -->
    <section id="quiz" class="section-block">
      <div class="section-header">
        <div class="section-icon">🧠</div>
        <h2 class="section-title">سادساً: كويز الفهم والتقييم الذاتي لليوم 1</h2>
      </div>

      <!-- Q1 -->
      <div class="quiz-card" id="sq1">
        <div class="quiz-question">1. في تشبيه المطعم، من يمثل بروتوكول الـ HTTP؟</div>
        <div class="quiz-options">
          <div class="quiz-option" onclick="checkSimpleQuiz('sq1', 0, false, 'غير صحيح، الزبون هو العميل (Client) كالمتصفح أو كود بايثون.')">أ) الزبون الجالس على الطاولة</div>
          <div class="quiz-option" onclick="checkSimpleQuiz('sq1', 1, true, 'إجابة صحيحة 100%! النادل هو الناقل (HTTP) الذي ينقل ورقة الطلب ويعود بالرد.')">ب) النادل (الويتر) الذي ينقل ورقة الطلب ويعود بالطبق</div>
          <div class="quiz-option" onclick="checkSimpleQuiz('sq1', 2, false, 'غير صحيح، المطبخ هو السيرفر وقاعدة البيانات.')">ج) المطبخ الذي يجهز الطعام</div>
        </div>
        <div class="quiz-feedback" id="sq1-fb"></div>
      </div>

      <!-- Q2 -->
      <div class="quiz-card" id="sq2">
        <div class="quiz-question">2. ماذا يفعل السيرفر عندما يجد السطر الفارغ الإجباري في رسالة الـ HTTP؟</div>
        <div class="quiz-options">
          <div class="quiz-option" onclick="checkSimpleQuiz('sq2', 0, true, 'عاشت إيدك! يعرف أن الترويسات انتهت ويبدأ في قراءة كائن الـ Body المحتوي على البيانات.')">أ) يفهم أن معلومات الترويسات انتهت، والآن سيبدأ استلام جسم البيانات (Body)</div>
          <div class="quiz-option" onclick="checkSimpleQuiz('sq2', 1, false, 'غير صحيح، السطر الفارغ إشارة أساسية للفصل وليس لإلغاء الاتصال.')">ب) يغلق الاتصال فوراً لأنه ظن أن الطلب فارغ</div>
        </div>
        <div class="quiz-feedback" id="sq2-fb"></div>
      </div>

      <!-- Q3 -->
      <div class="quiz-card" id="sq3">
        <div class="quiz-question">3. إذا أردت استرجاع قائمة الأحداث في نظام METRIX، أي مسار يمثل إتيكيت REST الصحيح؟</div>
        <div class="quiz-options">
          <div class="quiz-option" onclick="checkSimpleQuiz('sq3', 0, false, 'غير صحيح، هذا يحتوي فعلاً في الرابط (getAllEvents).')">أ) GET /getAllEvents</div>
          <div class="quiz-option" onclick="checkSimpleQuiz('sq3', 1, true, 'إجابة عبقرية! المسار اسم جمع والميثود GET تعبر عن القراءة.')">ب) GET /events</div>
        </div>
        <div class="quiz-feedback" id="sq3-fb"></div>
      </div>
    </section>

    <!-- Section 7: Definition of Done -->
    <section id="dod" class="section-block">
      <div class="section-header">
        <div class="section-icon">🏁</div>
        <h2 class="section-title">سابعاً: معيار الإنجاز (Definition of Done)</h2>
      </div>

      <div class="card">
        <p style="margin-bottom: 16px; color: var(--muted);">
          إذا قمت بتشغيل أمر curl في التيرمينال ورأيت بعينيك خطوط الطلب &gt; وخطوط الاستجابة &lt;، فضع علامة على كل خطوة:
        </p>

        <div class="dod-checklist">
          <div class="dod-item" id="dod-s1" onclick="toggleSimpleDod('s1')">
            <div class="dod-checkbox" id="check-s1"></div>
            <div class="dod-text">1. فهمت تشبيه المطعم وكيف يمر النص عبر السلك (Request &rarr; Blank Line &rarr; Body).</div>
          </div>

          <div class="dod-item" id="dod-s2" onclick="toggleSimpleDod('s2')">
            <div class="dod-checkbox" id="check-s2"></div>
            <div class="dod-text">2. شغلت أمر curl في التيرمينال وشفت بعيني خطوط الطلب (&gt;) وخطوط الاستجابة (&lt;).</div>
          </div>

          <div class="dod-item" id="dod-s3" onclick="toggleSimpleDod('s3')">
            <div class="dod-checkbox" id="check-s3"></div>
            <div class="dod-text">3. جهزت مجلد day1 وملف .env.local في جهازك.</div>
          </div>

          <div class="dod-item" id="dod-s4" onclick="toggleSimpleDod('s4')">
            <div class="dod-checkbox" id="check-s4"></div>
            <div class="dod-text">4. جاهز تماماً لليوم 2 للانتقال إلى n8n و Webhooks وربط هذه الحزم تلقائياً!</div>
          </div>
        </div>

        <div id="simple-celebration" class="celebration-box">
          <h3 style="color: #10b981; font-size: 22px; margin-bottom: 6px;">🎉 ألف مبروك يا منتظر! أنجزت اليوم الأول بنجاح باهر!</h3>
          <p style="color: #e2e8f0; font-size: 15px;">
            أنت الآن فهمت ما عجزت الجامعة عن شرحه عملياً، وجاهز تماماً لليوم الثاني!
          </p>
        </div>
      </div>
    </section>

    <!-- Master Prompt Section -->
    <section class="section-block">
      <div class="prompt-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="color: var(--primary); font-size: 15px;">🤖 الـ Master Prompt لتحسين أي ملف تعليمي للمبتدئين:</strong>
          <button class="copy-btn" onclick="copySnippet('master-prompt-text')">نسخ البرومبت</button>
        </div>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">
          احفظ هذا البرومبت في مفكرتك؛ إذا أردت يوماً إعطاء أمر لأي نموذج ذكاء اصطناعي ليحول أي ملف تعليمي معقد إلى شرح مبسط من الصفر:
        </p>
        <pre id="master-prompt-text" class="code-block" style="direction: rtl; text-align: right; font-family: 'MSjawhara', sans-serif; font-size: 13px; color: #94a3b8; max-height: 200px;">أنت مهندس برمجيات أول ومعلم تقني متخصص في تبسيط المفاهيم للمبتدئين من الصفر المطلق.
أمامك ملف HTML تعليمي لمشروع برمجيات (اليوم الأول من مسار METRIX). 

أريدك أن تعيد صياغة المحتوى والشروحات داخل هذا الملف ليناسب طالباً جامعياً مبتدئاً تماماً في مجال الـ Backend والشبكات العملية، وفق المعايير الصارمة التالية:

1. أسلوب الشرح (Zero Jargon):
   - ابدأ كل مفهوم بتشبيه واقعي وبسيط جداً (Mental Model) قبل كتابة أي مصطلح إنجليزي.
   - اشرح بروتوكول HTTP كرسالة نصية صريحة مارة بسلك، وفكك كل بايت مع توضيح "لماذا نحتاجه عملياً؟".
   - اشرح أهمية السطر الفارغ الإجباري (CRLF) ولماذا ينهار السيرفر بدونه بأسلوب تجربة مرئية.
   - بسّط مفهوم RESTful API إلى (تسمية الموارد بالأسماء + استخدام الأفعال القياسية + الحيادية Idempotency).

2. التجربة التفاعلية داخل الصفحة:
   - اجعل الأزرار والأجزاء التفاعلية تفاعلية بصرياً (Tooltips / Highlight / Click-to-Inspect).
   - احتفظ بالتصميم الجمالي الداكن الداعم لخطوط واضحة جداً.
   - وفّر كويزاً بسيطاً متعدد الخيارات يوضح للطالب "لماذا هذا الجواب صحيح ولماذا الآخر خاطئ".
   - أضف قائمة فحص إنجاز (Definition of Done) بأربع خطوات واضحة ومباشرة.

3. القيود التقنية:
   - يجب أن يبقى الكود بالكامل في ملف HTML واحد متكامل (Single File) متضمناً الـ CSS والـ JavaScript.</pre>
      </div>
    </section>

  </main>

  <script>
    // 1. Reading Progress
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / docHeight) * 100;
      document.getElementById('progress-bar').style.width = scrolled + '%';
    });

    // 2. CRLF Simulator
    function toggleCrlfSim(hasCrlf) {
      const btnWith = document.getElementById('btn-crlf-with');
      const btnWithout = document.getElementById('btn-crlf-without');
      const res = document.getElementById('crlf-result');

      if (hasCrlf) {
        btnWith.classList.add('selected');
        btnWithout.classList.remove('selected');
        res.style.color = '#34d399';
        res.innerText = '[Server Parser Status]: CRLF detected at byte 112 -> Header section closed -> Body parsing started successfully (Status 200 OK).';
      } else {
        btnWithout.classList.add('selected');
        btnWith.classList.remove('selected');
        res.style.color = '#f87171';
        res.innerText = '[Server Parser Status]: ERROR! No empty line found! The server is waiting indefinitely for headers to finish... Connection Timed Out (504 Gateway Timeout)!';
      }
    }

    // 3. Simple Idempotency Sandbox
    function runSimpleSim(method) {
      const out = document.getElementById('simple-sim-output');
      const btnPost = document.getElementById('simple-post-btn');
      const btnDel = document.getElementById('simple-del-btn');

      if (method === 'POST') {
        btnPost.classList.add('selected');
        btnDel.classList.remove('selected');
        out.innerHTML = `> نقر منتظر الزر مرتين متتاليتين:\\n` +
          `النقرة الأولى: POST /events -> تم إنشاء حدث جديد (ID: 101) في قاعدة البيانات.\\n` +
          `النقرة الثانية: POST /events -> تم إنشاء حدث مكرر (ID: 102) في قاعدة البيانات!\\n\\n` +
          `⚠️ النتيجة: تكرر السجل مرتين في الداتابيس! (POST غير حيادية Non-Idempotent).`;
      } else {
        btnDel.classList.add('selected');
        btnPost.classList.remove('selected');
        out.innerHTML = `> نقر منتظر الزر مرتين متتاليتين:\\n` +
          `النقرة الأولى: DELETE /events/101 -> تم حذف الحدث رقم 101 بنجاح (204 No Content).\\n` +
          `النقرة الثانية: DELETE /events/101 -> الحدث محذوف مسبقاً (404 Not Found)، حالة الداتابيس لم تتغير!\\n\\n` +
          `✅ النتيجة: لم يحدث أي ضرر عند التكرار! (DELETE عملية حيادية Idempotent).`;
      }
    }

    // 4. Quiz Logic
    function checkSimpleQuiz(qid, idx, isCorrect, msg) {
      const card = document.getElementById(qid);
      const options = card.querySelectorAll('.quiz-option');
      const fb = document.getElementById(qid + '-fb');

      options.forEach((opt, i) => {
        opt.onclick = null;
        if (i === idx) {
          opt.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
      });

      fb.style.display = 'block';
      fb.style.background = isCorrect ? 'var(--success-bg)' : 'var(--destructive-bg)';
      fb.style.color = isCorrect ? '#a7f3d0' : '#fecdd3';
      fb.style.border = '1px solid ' + (isCorrect ? 'var(--success)' : 'var(--destructive)');
      fb.innerText = msg;
    }

    // 5. DoD Checklist
    const dodChecked = { s1: false, s2: false, s3: false, s4: false };

    function toggleSimpleDod(id) {
      dodChecked[id] = !dodChecked[id];
      const item = document.getElementById('dod-' + id);
      const check = document.getElementById('check-' + id);

      if (dodChecked[id]) {
        item.classList.add('checked');
        check.innerHTML = '✔';
      } else {
        item.classList.remove('checked');
        check.innerHTML = '';
      }

      const all = Object.values(dodChecked).every(v => v === true);
      const cel = document.getElementById('simple-celebration');
      cel.style.display = all ? 'block' : 'none';
      if (all) cel.scrollIntoView({ behavior: 'smooth' });
    }

    // 6. Copy Snippet
    function copySnippet(id) {
      const el = document.getElementById(id);
      const text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const orig = btn.innerText;
        btn.innerText = 'تم النسخ! ✔';
        setTimeout(() => { btn.innerText = orig; }, 1800);
      });
    }
  </script>
</body>
</html>
"""

html_final = html_template.replace("{{FONT_BASE64}}", font_b64)

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write(html_final)

print(f"File updated at: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH)} bytes")
