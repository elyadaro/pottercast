# פוטרקאסט - מערכת ניחושים בזמן אמת

מערכת לאיסוף ניחושים בזמן אמת וזיהוי הראשון שניחש נכון.

## התקנה והרצה

### 1. התקנת תלויות
```bash
npm install
```

### 2. הגדרת Supabase

1. צור פרויקט חדש ב-[Supabase](https://supabase.com)
2. העתק את ה-URL וה-anon key מהפרויקט
3. צור קובץ `.env.local` בשורש הפרויקט:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. יצירת טבלאות במסד הנתונים

1. היכנס ל-Supabase Dashboard
2. עבור ל-SQL Editor
3. הרץ את הקוד מקובץ `DATABASE_SCHEMA.sql`

### 4. הרצת הפרויקט מקומית
```bash
npm run dev
```

הפרויקט יעלה על http://localhost:3000

## דפי המערכת

### דף הצבעה - `/`
- משתמשים מזינים ניחושים (1-10.5) לכל מועמד
- מזינים שם מלא
- ההצבעה נשמרת עם timestamp מדויק (client-side)

### דף מנהלים - `/admin`
- בחירת מועמדים פעילים (יוצגו למשתמשים)
- הזנת התוצאות הסופיות הנכונות
- כפתור "מי הראשון?" - מוצא את הראשון שניחש בדיוק נכון

## פריסה ל-Vercel

1. התקן Vercel CLI:
```bash
npm i -g vercel
```

2. התחבר ל-Vercel:
```bash
vercel login
```

3. פרוס את הפרויקט:
```bash
vercel
```

4. הגדר את משתני הסביבה ב-Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## טכנולוגיות

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
