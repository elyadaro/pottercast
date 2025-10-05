# הוראות התקנה והגדרה - מערכת ניחושי פוטרקאסט

## שלב 1: הגדרת Supabase

### 1.1 יצירת פרויקט Supabase
1. היכנס ל-https://supabase.com
2. צור פרויקט חדש
3. שמור את ה-URL וה-ANON_KEY

### 1.2 הרצת סקריפט מסד הנתונים
1. היכנס לפרויקט ב-Supabase
2. לחץ על **SQL Editor** בתפריט הצד
3. העתק והדבק את כל התוכן מקובץ `DATABASE_SCHEMA.sql`
4. הרץ את הסקריפט

### 1.3 הפעלת Authentication Providers

#### Google OAuth
1. עבור ל-**Authentication** → **Providers** → **Google**
2. הפעל את ה-provider
3. צור Google OAuth credentials:
   - עבור ל-https://console.cloud.google.com
   - צור פרויקט חדש או בחר קיים
   - הפעל Google+ API
   - צור OAuth 2.0 credentials
   - הוסף Authorized redirect URIs:
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
4. העתק את ה-Client ID ו-Client Secret ל-Supabase

#### Email (Magic Link)
1. עבור ל-**Authentication** → **Providers** → **Email**
2. ודא שהאופציה מופעלת
3. בחר באופציה **Enable email confirmations** (או השאר כבוי לפשטות)

#### Phone (SMS)
1. עבור ל-**Authentication** → **Providers** → **Phone**
2. הפעל את ה-provider
3. בחר SMS provider (מומלץ: Twilio)
4. הזן את הפרטים של ה-SMS provider שלך

### 1.4 הגדרת Admin
כדי להפוך משתמש למנהל:
1. המשתמש צריך להתחבר לפחות פעם אחת
2. עבור ל-**Authentication** → **Users**
3. מצא את המשתמש ולחץ עליו
4. גלול ל-**User Metadata** (או **Raw user meta data**)
5. הוסף שדה:
   ```json
   {
     "is_admin": true
   }
   ```
6. שמור

## שלב 2: הגדרת משתני סביבה

צור קובץ `.env.local` בשורש הפרויקט:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

## שלב 3: התקנת תלויות

```bash
npm install
```

## שלב 4: הרצת האפליקציה

```bash
npm run dev
```

האפליקציה תהיה זמינה ב-http://localhost:3000

## מבנה האפליקציה

### דפים
- `/` - דף הניחושים הראשי (דורש התחברות)
- `/auth` - דף התחברות (3 אפשרויות: Google, Email, SMS)
- `/admin` - עמוד מנהלים (דורש הרשאות admin)

### תכונות משתמשים
- התחברות עם Google OAuth
- התחברות עם Email (Magic Link - ללא סיסמה)
- התחברות עם SMS (OTP)
- שמירת שם מלא (חובה)
- משתמש יכול להציב ניחוש אחד
- עריכת ניחוש (הזמן יתעדכן)

### תכונות מנהלים
- בחירת מועמדים פעילים
- הזנת תוצאות סופיות
- צפייה בכל הניחושים (כולל שם מלא ופרטי קשר)
- מציאת המנחש הנכון הראשון

## אבטחה

### Row Level Security (RLS)
- משתמשים יכולים לראות ולערוך רק את הניחושים שלהם
- רק מנהלים יכולים לראות את כל הניחושים
- רק מנהלים יכולים לערוך מועמדים ותוצאות

### Middleware
- הגנה על דפים שדורשים התחברות
- הגנה על עמוד מנהלים (רק למשתמשים עם `is_admin: true`)

## טיפים

### בדיקת המערכת
1. התחבר עם משתמש רגיל
2. בצע ניחוש
3. ערוך את הניחוש (ודא שהזמן התעדכן)
4. התנתק והתחבר כמנהל
5. צפה בכל הניחושים
6. הזן תוצאות
7. מצא את הזוכה

### פתרון בעיות נפוצות

**בעיה:** "שגיאה בשמירת הניחוש"
**פתרון:** ודא ש-RLS policies הוגדרו נכון ב-Supabase

**בעיה:** "לא מצליח להתחבר עם Google"
**פתרון:** ודא שה-Redirect URI נכון ב-Google Console

**בעיה:** "לא מקבל SMS/Email"
**פתרון:** ודא שה-SMS/Email provider מוגדר נכון ב-Supabase

## פריסה (Deployment)

### Vercel
1. חבר את ה-repository ל-Vercel
2. הוסף את משתני הסביבה ב-Vercel Dashboard
3. פרוס!

זכור: ודא שה-Redirect URIs ב-Supabase וב-Google Console מעודכנים ל-URL של הפריסה.
