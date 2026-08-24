# قاعدة بيانات ماتريكس

## الطريقة الأسرع — ملف واحد

الصق [`../setup.sql`](../setup.sql) كاملاً في **Supabase Dashboard → SQL Editor → Run**.

يشتغل على أي حالة: مشروع جديد تمامًا، أو مشروع طُبّقت عليه `0001`–`0004` سابقاً.
كل أمر فيه idempotent — الجداول بـ `IF NOT EXISTS`، والسياسات تُحذف قبل إعادة
إنشائها، ودالتا المراحل تُحذفان أولاً لأن نوع الإرجاع تغيّر (Postgres يرفض
`CREATE OR REPLACE` على نوع إرجاع مختلف).

بعدها تحقّق:

```bash
./scripts/check-db.sh
```

## الملفات المنفصلة

موجودة للمراجعة والتاريخ. `setup.sql` يساويها مجتمعة.

| # | الملف | المحتوى |
|---|---|---|
| 1 | `0001_schema.sql` | ٨ جداول + فهارس + علاقات |
| 2 | `0002_rls.sql` | دوال العضوية + ١٠ سياسات |
| 3 | `0003_functions.sql` | ٦ دوال RPC |
| 4 | `0004_storage.sql` | مخزنا `avatars` و`milestones` + ٥ سياسات |
| 5 | `0005_fix_rls_recursion.sql` | ترقيع لمن طبّق النسخة الأولى من `0002`/`0003` |

> إذا شغّلت `setup.sql` فلا تحتاج `0005` إطلاقاً — تصحيحاته مدمجة فيه.

## ثلاث مصائد تفشل صامتة

**١. تكرار RLS اللانهائي.** سياسة تسأل «هل المستخدم عضو في هذا التحدي؟» باستعلام
من `challenge_participants` داخل سياسة نفس الجدول تسبّب خطأ `42P17` — ولا يسقط
ذاك الجدول وحده، بل `goals` و`sub_layers` و`task_checkins` و`daily_logs`
و`challenge_rooms` معه، لأن سياساتها كلها تشير إليه. الحل دالتا
`my_challenge_ids()` و`my_challenge_goal_ids()` بصلاحية `SECURITY DEFINER`.

**٢. شكل إرجاع الدالة.** `record_goal_milestone` لازم `RETURNS jsonb`. لو كانت
`RETURNS TABLE` لأرجعها PostgREST داخل مصفوفة `[{…}]`، فيصير `rpcData.log_id`
في المسار `undefined` — تُحفظ المرحلة وترجع بلا معرّف. بالمقابل
`create_goal_challenge` و`join_goal_challenge` تبقيان `RETURNS TABLE` لأن
مساريهما يستدعيان `.single()`.

**٣. نصوص الأخطاء عقد برمجي.** `getRpcHttpStatus()` في
`src/app/api/goal/milestone/route.ts` يطابق حرفياً على
`goal_not_found_or_access_denied` و`log_not_found_or_access_denied`
و`not_a_milestone`. ودوال التحدي لها مفرداتها في
`src/app/api/challenges/shared.ts`. أي نص آخر يتحول لخطأ 500 غامض.

## اللي ما يكشفه الكود

قيم اخترتها بشكل متساهل حتى لا يفشل أي شي يسويه التطبيق:

- `goals.target_points` افتراضي `10000`
- `goals.status` نص حر — الكود يستخدم `'active'` فقط
- رمز الدعوة ٦ أحرف بدون الملتبسة (0/O/1/I)، والغرفة تسع اثنين

## نقطة تحتاج قرارك

`daily_logs_read_challenge_opponent` تسمح لخصمك بقراءة سجلات هدفك المشترك —
**بما فيها النص**، لأن الصف يخزّن النقاط والنص معاً. الواجهة تعرض النقاط فقط،
لكن الصلاحية أوسع من العرض. الحل النظيف VIEW يكشف `ai_score` و`created_at`
فقط. اطلبها إذا تريدها.
