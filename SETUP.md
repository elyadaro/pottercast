# Pottercast - מערכת ניחושים עם התחברות משתמשים

## סקירה כללית

מערכת זו מאפשרת למשתמשים להצביע/לנחש ציונים למועמדים שונים, עם מערכת התחברות פשוטה התומכת ב-2 שיטות:
- אימייל (ללא אימות)
- טלפון (ללא אימות)

המערכת בנויה על Next.js 15 ו-Supabase Auth.

## שלבי התקנה

### 1. התקנת תלויות

```bash
npm install
```

החבילות הנדרשות כבר מותקנות:
- `@supabase/supabase-js`
- `@supabase/ssr`
- `@supabase/auth-ui-react`
- `@supabase/auth-ui-shared`

### 2. הגדרת Supabase

#### 2.1 יצירת פרויקט Supabase

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. צור פרויקט חדש
3. שמור את ה-URL וה-anon key

#### 2.2 הגדרת משתני סביבה

צור קובץ `.env.local` בשורש הפרויקט:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 2.3 הרצת Schema במסד הנתונים

1. פתח את SQL Editor ב-Supabase Dashboard
2. העתק והרץ את התוכן של `DATABASE_SCHEMA.sql`

הסכמה כולל:
- טבלת `users` - פרופילי משתמשים
- טבלת `candidates` - מועמדים להצבעה
- טבלת `votes` - ההצבעות (הצבעה אחת לכל משתמש)
- טבלת `results` - תוצאות אמיתיות (למנהלים)
- Triggers לעדכון אוטומטי של timestamps
- RLS policies לאבטחת נתונים

### 3. הגדרת Authentication ב-Supabase

עבור ל-Authentication > Settings:

**Email Auth:**
- ✅ Enable Email Signups
- ❌ **Confirm Email (חשוב! כבה את זה!)**
- ❌ Secure Email Change (כבה)

**Phone Auth:**
- הקוד משתמש בפתרון workaround (phone@pottercast.local)
- אין צורך להפעיל SMS provider
- אפשר להשאיר את Phone provider מבוטל

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs (בפרודקשן):**
```
https://your-domain.com/**
```

**הערה:** כאשר משתמשים נרשמים, הקוד שומר את השם הפרטי והמשפחה במטא-דאטה ובטבלת `users` המותאמת אישית.

### 4. הרצת האפליקציה

```bash
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000) בדפדפן.

## זרימת העבודה

### משתמש רגיל

1. משתמש נכנס לעמוד הראשי
2. ממלא ניחושים לכל המועמדים (1-10.5)
3. לוחץ "שלח" → זמן ההצבעה נשמר
4. מופיע מודל התחברות עם 2 אפשרויות:
   - אימייל + שם מלא
   - טלפון + שם מלא
   - אפשרות "כבר ניחשתי" להתחברות לחשבון קיים
5. לאחר התחברות, ההצבעה נשמרת אוטומטית
6. אם המשתמש חוזר, הוא רואה את הניחוש הקיים ויכול לערוך

### מנהל

1. נכנס ל-`/admin`
2. יכול:
   - להפעיל/לבטל מועמדים
   - להזין תוצאות אמיתיות
   - למצוא את הזוכה הראשון שניחש נכון
   - לראות רשימה של כל ההצבעות עם פרטי קשר

## מבנה הקבצים

```
pottercast/
├── app/
│   ├── page.tsx              # דף הצבעה ראשי
│   ├── admin/
│   │   └── page.tsx          # דף מנהלים
│   └── layout.tsx            # Layout ראשי
├── components/
│   ├── AuthModal.tsx         # מודל התחברות/הרשמה
│   └── AuthGuard.tsx         # הגנה על routes
├── lib/
│   ├── supabase.ts           # Client של Supabase
│   ├── supabase-server.ts    # Server client
│   └── auth.ts               # פונקציות Auth
├── middleware.ts             # Middleware לניהול sessions
└── DATABASE_SCHEMA.sql       # סכמת מסד הנתונים
```

## אבטחה

### Row Level Security (RLS)

כל הטבלאות מוגנות ב-RLS:

**users:**
- משתמשים יכולים לראות/לערוך רק את הפרופיל שלהם
- מנהלים יכולים לראות הכל (דרך service role)

**votes:**
- משתמשים יכולים לראות/לערוך רק את ההצבעה שלהם
- מנהלים יכולים לראות הכל

**candidates & results:**
- כולם יכולים לקרוא
- רק מנהלים יכולים לעדכן (דרך service role או admin role)

### הערה חשובה

המערכת מיועדת לסביבה לא רגישה. אבטחת הנתונים היא בסיסית:
- אין אימות אימייל/טלפון
- סיסמאות נוצרות אוטומטית (משתמשים לא יודעים אותן)
- התחברות חוזרת דורשת יצירת חשבון חדש או שימוש באפשרות "כבר ניחשתי"

## פתרון בעיות נפוצות

### בעיית Email Confirmation

אם משתמשים לא מצליחים להירשם:
1. ודא ש-"Confirm Email" **כבוי** ב-Supabase (חשוב מאוד!)
2. בדוק שה-Site URL מוגדר נכון ל-`http://localhost:3000`
3. אם עדיין לא עובד, נסה למחוק את המשתמש ב-Supabase Dashboard ולהירשם מחדש

### RLS מונע גישה

אם אתה רואה שגיאות של permissions:
1. ודא שהרצת את כל ה-SQL מ-`DATABASE_SCHEMA.sql`
2. בדוק שה-policies הופעלו נכון
3. לפיתוח, אפשר לכבות RLS זמנית (לא מומלץ בפרודקשן)

### משתמשים לא יכולים לערוך הצבעות

ודא שה-trigger `update_votes_updated_at` הופעל:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'update_votes_updated_at';
```

## Deploy לפרודקשן

### Vercel (מומלץ)

1. Push הפרויקט ל-GitHub
2. חבר ל-Vercel
3. הוסף משתני סביבה:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. עדכן את Site URL ו-Redirect URLs ב-Supabase:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/**`
5. Deploy!

## תכונות עתידיות אפשריות

- [ ] SMS OTP אמיתי לטלפון
- [ ] Email verification אופציונלית
- [ ] ממשק Admin משופר
- [ ] ניהול הרשאות מתקדם
- [ ] היסטוריית עריכות
- [ ] דאשבורד סטטיסטיקות
- [ ] Export לExcel
- [ ] לוח תוצאות חי

## רישיון

ISC

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
