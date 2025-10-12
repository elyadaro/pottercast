# ✅ רשימת בדיקה לפני האירוע

## 🔧 הכנה (לעשות פעם אחת)

### Supabase
- [ ] רץ את `PERFORMANCE_INDEXES.sql` ב-SQL Editor
- [ ] וידא שכל ה-indexes נוצרו (בדוק ב-Database → Indexes)
- [ ] בדוק ש-"Confirm Email" **מבוטל** ב-Authentication → Settings
- [ ] (אופציונלי) שדרג ל-Pro ליום האירוע ($25)

### Vercel
- [ ] הוסף `SUPABASE_POOLER_URL` ב-Environment Variables
- [ ] עשה deployment של הקוד החדש
- [ ] וודא ש-build עבר בהצלחה
- [ ] בדוק שהאתר טוען ללא שגיאות

### בדיקות מקומיות
- [ ] `npm install` - התקנת dependencies
- [ ] `npm run build` - וידוא שה-build עובד
- [ ] `npm run dev` - בדיקה מקומית
- [ ] טעינת דף ראשי ללא שגיאות
- [ ] הצבעה מוצלחת של משתמש חדש
- [ ] עריכת הצבעה קיימת עובדת

---

## 🧪 בדיקות לפני האירוע (24 שעות לפני)

### בדיקת Performance
- [ ] פתח את האתר במצב Incognito
- [ ] בדוק זמן טעינה (צריך להיות < 2 שניות)
- [ ] מלא את הטופס
- [ ] שלח הצבעה
- [ ] וודא שההצבעה נשמרה (רענן את הדף)

### בדיקת Mobile
- [ ] פתח באייפון/אנדרואיד
- [ ] וודא שהכל נראה טוב
- [ ] נסה למלא ולשלח הצבעה
- [ ] בדוק שמקלדת המספרים נפתחת (input type="decimal")

### בדיקת Edge Cases
- [ ] נסה להצביע פעמיים (אותו משתמש)
- [ ] וודא שעריכה עובדת
- [ ] נסה להצביע עם ערכים לא תקינים (11, -5)
- [ ] וודא שיש validation
- [ ] נסה להישאר 5 דקות ללא פעילות (בדיקת session)

### בדיקת Logs
- [ ] היכנס ל-Vercel Dashboard → Logs
- [ ] וודא שאין errors
- [ ] היכנס ל-Supabase Dashboard
- [ ] בדוק Database Connections (צריך להיות < 20)

---

## 🚀 ביום האירוע

### לפני שמשתפים קישור
- [ ] בדוק שהאתר עולה
- [ ] בדוק שאין error messages
- [ ] נסה הצבעה אחת אחרונה
- [ ] פתח Vercel Logs בטאב נפרד (לניטור)
- [ ] פתח Supabase Dashboard בטאב נפרד (לניטור)

### בזמן האירוע (ניטור)
- [ ] עקוב אחרי Vercel Logs כל 2-3 דקות
- [ ] חפש שגיאות (filter: "error")
- [ ] בדוק Supabase Connection Pool Usage
- [ ] אם רואה בעיות - תעד screenshot

### אחרי האירוע
- [ ] ייצא את כל ה-votes (Database → Table → Export)
- [ ] שמור backup של הדאטה
- [ ] בדוק שהמנצח זוהה נכון (Admin Dashboard)
- [ ] (אם שדרגת) בטל את Supabase Pro

---

## 🔥 במקרה חירום

### אם האתר לא עובד בכלל
1. [ ] בדוק Vercel Status: https://www.vercel-status.com
2. [ ] בדוק Supabase Status: https://status.supabase.com
3. [ ] אם Vercel down → המתן או העבר ל-platform אחר
4. [ ] אם Supabase down → המתן

### אם יש הרבה שגיאות
1. [ ] בדוק אם זה rate limiting (429 errors)
   - **פתרון**: הגדל limits ב-`lib/rate-limit.ts` ו-redeploy
2. [ ] בדוק אם זה connection pool (database errors)
   - **פתרון**: שדרג ל-Supabase Pro או המתן שהעומס ירד
3. [ ] בדוק אם זה authentication (401/403 errors)
   - **פתרון**: בדוק Supabase Auth settings

### אם האתר איטי מאוד
1. [ ] בדוק Network tab ב-DevTools
2. [ ] זהה איזה API call איטי
3. [ ] בדוק Supabase Database Performance
4. [ ] אם צריך - שדרג compute ב-Supabase

---

## 📞 אנשי קשר חירום

**Vercel Support**:
- Discord: https://vercel.com/discord
- Twitter: @vercel

**Supabase Support**:
- Discord: https://discord.supabase.com
- Email: support@supabase.io

**במקרה קיצון**:
- פנה לצ'אט Claude עם screenshots של הבעיה

---

## 📊 מספרים לעקוב אחריהם

### טוב מאוד ✅
- Connection Pool Usage: < 30%
- Response Time: < 1 second
- Error Rate: < 1%
- Cache Hit Rate: > 70%

### טוב ⚠️
- Connection Pool Usage: 30-60%
- Response Time: 1-3 seconds
- Error Rate: 1-5%
- Cache Hit Rate: > 50%

### בעייתי ❌
- Connection Pool Usage: > 80%
- Response Time: > 5 seconds
- Error Rate: > 10%
- Cache Hit Rate: < 30%

אם אתה ב"בעייתי" - פעל לפי "במקרה חירום" למעלה.

---

## ✨ טיפים אחרונים

1. **הכן הודעה מראש** למשתתפים:
   > "אם אתם רואים הודעת שגיאה, רעננו את הדף ונסו שוב. הניחושים שלכם נשמרו!"

2. **תדריך קצר**:
   - מלאו את כל השדות
   - לחצו "שלח"
   - אם מתבקש - התחברו/הירשמו
   - זהו!

3. **צרו sense of urgency** (אופציונלי):
   > "המערכת תהיה פתוחה רק ל-2 שעות הקרובות!"

4. **הכינו תשובות לשאלות נפוצות**:
   - "איך אני יודע שזה נשמר?" → "תראה הודעת הצלחה ירוקה"
   - "אפשר לשנות?" → "כן, פשוט היכנס שוב"
   - "מה אם יש שגיאה?" → "רענן את הדף ונסה שוב"

---

בהצלחה! 🎉 אתה מוכן!
