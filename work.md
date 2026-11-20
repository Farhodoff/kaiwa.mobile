# Kaiwa.mobile — bajarilishi kerak bo‘lgan ishlar

Ko‘rib chiqilgan sana: 2026-11-19.

Ro‘yxat joriy kod va loyiha sozlamalariga asoslangan. Jonli backend, qurilmadagi audio, OAuth va do‘konlarga chiqarish jarayoni tekshirilmadi; ularga tegishli bandlar tekshirish vazifasi sifatida berilgan.

Ustuvorlik: **P0** — ma’lumotlar ishonchliligi; **P1** — asosiy funksiyalarni yakunlash; **P2** — sifat va chiqarishga tayyorgarlik; **P3** — keyingi imkoniyatlar.

## Bajarilmoqda — birinchi bosqich (2026-11-19)

- [x] Har bir hisob uchun mahalliy progress nusxasi va diskda saqlanadigan yuborish navbati qo‘shildi. XP, sozlamalar, darslar, karta belgilari va kunlik faollik ketma-ket yuboriladi. Xato foydalanuvchiga ko‘rinadi; faol ilovada 30 soniyada, fondan qaytganda yoki qo‘lda qayta uriniladi.
- [x] Serverdagi yuklash xatosi bo‘sh/nol progress deb qabul qilinmaydi. Mahalliy nusxa bo‘lmasa qayta urinish oynasi chiqadi; yangi amallar tugamaguncha yuklash oynasi bilan himoyalanadi. Sekin javob yangi o‘zgarishlarni bosmaydi.
- [x] Darsni qayta tugatish `lessonsDone`ni takror oshirmaydi. Tugallangan darsni qayta ko‘rish avvalgi tugallanish va ballni o‘chirmaydi.
- [x] Hisobdan chiqishdan `resetSession` chaqiruvi olib tashlandi.
- [x] Navbat va dars natijalari uchun 10 ta avtomatik test qo‘shildi (`npm test`, Node 22.18+).
- [ ] iOS/Android’da parvoz rejimi, qayta ishga tushirish, OAuth/onboarding va hisob almashtirish oqimlarini tekshirish.
- [ ] Bir hisob bir nechta qurilmada ishlaganda konfliktlarni serverda hal qilish. Joriy navbat yakuniy qiymatlarni qayta yuboradi: bitta qurilmada takror yuborish xavfsiz, ammo boshqa qurilmadagi yangi qiymatni bosish xavfi hali mavjud. Shu sabab quyidagi P0 bandlari to‘liq tugallangan deb belgilanmadi.

Chegara: bu bosqich progressni keshlaydi; dars katalogi va audio uchun to‘liq oflayn rejim qo‘shilmadi. Jonli backendda faqat mavjud unique indekslar va foydalanuvchiga tegishlilik siyosatlari o‘qib tekshirildi; yozish amallari yoki sxema o‘zgarishlari bajarilmadi. Darsdagi noyob so‘zlar, haqiqiy daqiqalar va mahalliy kun hisoblari keyingi P0 ishlarida qoladi.

## Audio bo‘yicha bajarilgan ishlar (2026-11-19)

- [x] `expo-av` o‘rniga SDK 57 bilan mos `expo-audio` ulandi; mikrofon ruxsatlari config plugin orqali sozlandi.
- [x] Native PCM yozuv va brauzer yozuvi haqiqiy 16 kHz / mono / 16-bit WAV formatiga aylantiriladi. Ovoz formati faqat sarlavhada o‘zgartirilmaydi.
- [x] Mikrofonni yoqish, yozish, matnga aylantirish, ruxsat/xato holatlari ko‘rsatiladi. Chiqishda yozuv yuborilmasdan bekor qilinadi; bir yozuv ikki marta yuborilmaydi.
- [x] AI ovozi uchun playback tozalash va so‘rovni bekor qilish qo‘shildi. Eski `require()` lint ogohlantirishi olib tashlandi.
- [x] Brauzerda haqiqiy mikrofon → yaponcha transkripsiya → jonli AI javobi va ovozni qayta eshittirish sinovdan o‘tdi. Brauzer jurnalida xato qayd etilmadi.
- [x] Audio format, ruxsatni rad etish, kechikkan mikrofon va transkripsiyani bekor qilish uchun 8 ta test qo‘shildi; jami 18 ta test o‘tdi. Lint va typecheck muvaffaqiyatli.
- [ ] Yangi native build bilan jismoniy iOS/Android qurilmalarda mikrofon va playbackni sinash; ushbu kompyuterda tayyor iPhone simulyatori mavjud emas.

## iPhone Expo Go mosligi — SDK 58

- [x] iPhone’dagi Expo Go SDK 58 talab qilgani uchun loyiha SDK 57’dan SDK 58’ga yangilandi; Expo modullari, React 19.3.0 va React Native 0.88.1 `expo install --fix` bilan moslashtirildi.
- [x] SDK 58’da `File.write()` asinxron bo‘lgani uchun TTS faylini yozish tugashi kutiladi; bekor qilingan ovoz fayli tozalanadi.
- [x] SDK 58: Expo Doctor 20/20, lint, typecheck va 18 ta test o‘tdi; iOS uchun bundle xatosiz tayyorlandi.
- [ ] SDK 58 yangilanishidan keyingi iPhone’dagi ishga tushirish va mikrofon sinovi.
- [x] iPhone’dan mobil JS bundle yuklangani server jurnalida tasdiqlandi. Google OAuth’dan so‘ng veb dashboard ochilib qolishi aniqlandi; Expo Go’da qo‘llanmaydigan Google/Apple oqimi to‘xtatilib, email/parol yoki mehmon rejimi ko‘rsatiladi.
- [ ] Google/Apple kirishini alohida native build’da `kaiwa://auth-callback` qaytish manzili bilan yakunlash; Supabase redirect ruxsatlari va telefonda qaytishni tekshirish. Expo Go’dagi web login mobil sessiyani tasdiqlamaydi.

## P0 — progress va ma’lumotlar ishonchliligi

- [ ] **Progressni saqlash xatolarini yashirmaslik va qayta yuborishni qo‘shish.**
  - Manba: `src/store/AppContext.tsx`, `src/services/progress.ts`.
  - Hozir bir nechta yozish amali `.catch(() => undefined)` bilan tugaydi; foydalanuvchi saqlanmagan o‘zgarishni bilmaydi. Mahalliy saqlash va yuborilmagan amallar navbatini tashkil qilish.
  - Tayyorlik mezoni: internetsiz bajarilgan dars/karta natijasi ilova qayta ochilganda saqlanadi, tarmoq qaytganda takrorlanmasdan sinxronlanadi.

- [ ] **Progress yuklanmasidan oldingi amallarni xavfsiz qilish.**
  - Manba: `src/store/AppContext.tsx` — `hydrate`, `apply`.
  - Yuklanish tugaguncha foydalanuvchi amallarini boshqarish; kech kelgan server javobi yangi o‘zgarishlarni bosib yubormasin.
  - Tayyorlik mezoni: sekin internet va hisob almashtirishda XP, dars natijalari va sozlamalar yo‘qolmaydi, boshqa hisobga o‘tmaydi.

- [ ] **Kunlik statistika va vaqt hisobini tuzatish.**
  - Manba: `src/store/AppContext.tsx`, `src/lib/dates.ts`, `src/services/progress.ts`.
  - `dailyGoalDone` har XP berilganda birga oshadi; `reviewedToday` esa barcha takrorlangan karta IDlari sonidan olinadi. `dates.ts` sana va salomlashishni ilova ochilgan paytga qotirib qo‘yadi. Mahalliy kun, haqiqiy faol vaqt, kun almashishi va streak qoidalarini birlashtirish.
  - Tayyorlik mezoni: tun yarmidan o‘tish, ilovani fondan qaytarish va yangi kun boshlanishida kunlik hisoblar to‘g‘ri yangilanadi.

- [ ] **Darslar va so‘zlarni qayta sanashni cheklash.**
  - Manba: `src/store/AppContext.tsx` — `saveLessonScore`, `learnWord`; `src/screens/LessonDetailScreen.tsx`.
  - `isCompleted` qayta yuborilsa `lessonsDone` yana oshadi. So‘z o‘rganish uchun ham barqaror identifikator va takrorlanish qoidasi kerak.
  - Tayyorlik mezoni: bir darsni qayta ochish yoki tugatish noyob o‘rganilgan dars/so‘z sonini sun’iy oshirmaydi.

- [ ] **Bir nechta qurilmadan yozishda hisoblar yo‘qolmasligini ta’minlash.**
  - Manba: `src/services/progress.ts` — progress yozish va `bumpActivity`.
  - Mijozdagi eski qiymatga asoslangan yozishlarni tekshirish; kerakli hisoblarni serverda atomar yangilash va takror yuborilgan amallarni ajratish.
  - Tayyorlik mezoni: bir hisob ikki qurilmada ishlaganda XP va kunlik faollik yo‘qolmaydi yoki ikki marta qo‘shilmaydi.

## P1 — asosiy funksiyalarni yakunlash

- [ ] **Navigatsiyani loyiha qoidasiga muvofiq Expo Router’ga o‘tkazish.**
  - Manba: `AGENTS.md`, `App.tsx`, `src/navigation/`, `src/screens/`.
  - Hozir qo‘lda tuzilgan React Navigation navigatorlari ishlatilgan, `src/app/` yo‘q. Auth, onboarding, tab va ichki ekranlar uchun route tuzilmasini yaratish.
  - Tayyorlik mezoni: kirish/chiqish, orqaga qaytish, OAuth qaytish havolasi va ichki havolalar iOS hamda Android’da ishlaydi.

- [ ] **Auth holati va onboarding yakunlanganini ishonchli saqlash.**
  - Manba: `src/store/AuthContext.tsx`, `src/services/auth.ts`, `src/services/oauth.ts`, onboarding ekranlari.
  - Auth o‘zgarishlarini kuzatish, sessiya tugashini boshqarish va onboarding holatini faqat vaqtinchalik belgiga bog‘lamaslik. Parolni tiklash va tasdiqlash xatini qayta yuborish oqimlarini qo‘shish.
  - Tayyorlik mezoni: yangi foydalanuvchi sozlashni tugatadi, qaytgan foydalanuvchi uni qayta o‘tmaydi; sessiya tugaganda yopiq ekranlar ochiq qolmaydi.

- [ ] **Audio kutubxonasi va ruxsatlarni SDK 57 hujjatlari bo‘yicha tekshirish.**
  - Manba: `package.json`, `app.json`, `src/services/stt.ts`, `src/services/tts.ts`.
  - Loyihada `expo-av` ishlatiladi. SDK bilan mosligini tekshirib, kerak bo‘lsa tavsiya etilgan audio moduliga o‘tish; mikrofon ruxsatlari va native konfiguratsiyani yakunlash.
  - Tayyorlik mezoni: development build’da mikrofon ruxsatini berish/rad etish, yozish, tinglash va ekrandan chiqishda resurslarni bo‘shatish sinovdan o‘tadi.

- [ ] **Nutqni tanish uchun audio formatini moslashtirish.**
  - Manba: `src/services/stt.ts`.
  - Yozish `HIGH_QUALITY` preset bilan bajariladi, yuborishda esa `audio/wav` belgilanadi. Haqiqiy fayl formati bilan STT xizmati talabi mosligini tekshirish va zarur konvertatsiyani tashkil qilish.
  - Tayyorlik mezoni: iOS va Android’da yozilgan yaponcha nutq taniladi; sukut, uzilgan tarmoq va yaroqsiz yozuv tushunarli xabar beradi.

- [ ] **TTS xatolari va ovoz sozlamasini bir xil boshqarish.**
  - Manba: `src/services/tts.ts`, `src/screens/ConversationScreen.tsx`, `src/screens/CardsScreen.tsx`.
  - Ayrim xatolar yutiladi, kartadagi `void playTTS(...)` esa xatoni ushlamaydi. Sozlamadagi ovoz kaliti avtomatik talaffuzga qanday ta’sir qilishini belgilash; tez ketma-ket so‘rovlarda eski audio yangi audioni bosmasin.
  - Tayyorlik mezoni: tinglash ishlamasa xabar ko‘rinadi, ovoz sozlamasi kutilganidek ishlaydi, yozish va tinglash to‘qnashmaydi.

- [ ] **Flashcardlar uchun SM-2 takrorlash tizimini amalga oshirish.**
  - Manba: `src/screens/CardsScreen.tsx`, `src/services/progress.ts`, `src/screens/OnboardingReadyScreen.tsx`.
  - Hozir baho asosan XP va keyingi kartaga o‘tishga ta’sir qiladi; takrorlash sanasi, interval va murakkablik koeffitsiyenti hisoblanmaydi. Ularni saqlash va muddati kelgan kartalar navbatini tuzish.
  - Tayyorlik mezoni: “yana/qiyin/yaxshi/oson” keyingi takrorlash vaqtiga ta’sir qiladi; natija qayta kirganda saqlanadi.

- [ ] **Kartalar yakuniy hisobotini haqiqiy sessiyadan hisoblash.**
  - Manba: `src/screens/CardsScreen.tsx`.
  - Hozir yakuniy XP `cards.length * 3`, lekin “yana” bahosi 1 XP beradi. Sessiya XPsi, baholar va ko‘rilgan kartalar sonini alohida yig‘ish.
  - Tayyorlik mezoni: hisobotdagi XP amalda qo‘shilgan XP bilan teng; bugungi hisob va joriy sessiya hisobi ajratilgan.

- [ ] **JLPT mashqlari va imtihon natijalarini saqlash.**
  - Manba: `src/screens/JlptScreen.tsx`, `src/screens/LessonQuizScreen.tsx`, `src/screens/MockTestScreen.tsx`, `src/store/AppContext.tsx`.
  - `jlptDone` o‘qiladi, lekin uni yangilash oqimi yo‘q. Bo‘limlar kesimidagi natija, urinishlar tarixi va xato javoblarni qayta ko‘rishni qo‘shish.
  - Tayyorlik mezoni: mashq tugagach tegishli bo‘lim progressi yangilanadi va ilova qayta ochilganda saqlanadi.

- [ ] **Mock imtihon taymeri va qoidalarini yakunlash.**
  - Manba: `src/screens/MockTestScreen.tsx`.
  - Barcha darajalar uchun bir xil 105 daqiqa va 60% ishlatiladi. Daraja/bo‘lim konfiguratsiyasini belgilash, taymerni tugash vaqtiga bog‘lash, fondan qaytish va urinishni tiklashni boshqarish.
  - Tayyorlik mezoni: ekran qulflanganda vaqt noto‘g‘ri uzaymaydi; chiqish, vaqt tugashi va qayta urinish natijani yoki XPni takror yozmaydi.

- [ ] **AI suhbat tarixi va haqiqiy davomiylikni saqlash.**
  - Manba: `src/screens/ConversationScreen.tsx`, `src/screens/SpeakScreen.tsx`.
  - Xabarlar hozir ekran holatida saqlanadi; chiqishda suhbatga qat’iy 3 daqiqa yoziladi. Suhbat sessiyasi, xabarlar va haqiqiy faol vaqt uchun saqlash oqimini qo‘shish.
  - Tayyorlik mezoni: oldingi suhbatni ochish mumkin; muvaffaqiyatsiz AI javobi yakunlangan mashq deb sanalmaydi.

- [ ] **Ma’lumot qayta yuklanayotganda eski kontentni boshqarish.**
  - Manba: `src/hooks/useAsync.ts`.
  - Parametr o‘zgarganda `loaded` va avvalgi `data` yangi so‘rov holatiga moslashtirilmaydi. Birinchi yuklanish, filtr almashishi va qayta yuklash holatlarini ajratish.
  - Tayyorlik mezoni: deck/daraja tez almashtirilganda avvalgi savollar bilan yangi bo‘limda amal bajarib bo‘lmaydi.

- [ ] **Bildirishnomalarni yangilashdagi poyga holatini tuzatish.**
  - Manba: `src/screens/NotificationsScreen.tsx`.
  - O‘qilgan qilish tugashidan oldin ro‘yxat yuklanadi, o‘chirish esa 400 ms kutishga bog‘langan. Amallar tugashini kutish, xatolarni ko‘rsatish va ommaviy yangilashni tashkil qilish.
  - Tayyorlik mezoni: sekin tarmoqda ham o‘qilgan holat va o‘chirilgan ro‘yxat darhol to‘g‘ri aks etadi.

## P2 — sifat va chiqarishga tayyorgarlik

- [ ] **Sozlamalardagi tugmalarni yakunlash.** Profilni tahrirlash, profil ma’lumotlari, yordam va maxfiylik siyosati amallarini ulash. Tayyor bo‘lmagan obuna va til funksiyalarini aniq belgilash. Manba: `src/screens/SettingsScreen.tsx`.
- [ ] **Reset amali chegarasini aniqlash.** Hozir `resetSession` ayrim hisoblarni tozalaydi, lekin bog‘liq server yozuvlari qoladi. Foydalanuvchiga nima tiklanishini tushuntirish va tasdiqlashdan keyin izchil bajarish. Oddiy chiqish progressni tiklashdan ajratilsin. Manba: `src/store/AppContext.tsx`, `src/screens/SettingsScreen.tsx`.
- [ ] **Haqiqiy eslatmalarni ulash.** Hozir bildirishnoma sozlamasi saqlanadi va ilova ichidagi ro‘yxat bor; qurilmadagi eslatmalar uchun ruxsat, vaqt tanlash, rejalashtirish va bekor qilish oqimini yaratish. Tayyorlik mezoni: o‘chirilgan eslatma kelmaydi.
- [ ] **Statistikadagi qat’iy qiymatlarni almashtirish.** `ProgressScreen.tsx` dagi keyingi `N2`, “42 ta dars qoldi” va ko‘nikma foizlarini tegishli daraja/kontent/natijalarga bog‘lash. Tinglash ko‘nikmasini karta soni bilan baholashni qayta ko‘rib chiqish.
- [ ] **Backendni qayta yaratish va ruxsatlarni tekshirish.** Kod ishlatayotgan jadvallar uchun migratsiyalar, indekslar va RLS siyosatlarini repoda hujjatlashtirish. Jonli muhitda borligini alohida tekshirish; bir foydalanuvchi boshqa foydalanuvchi progressini o‘qiy yoki o‘zgartira olmasligini sinash.
- [ ] **Muhit sozlamalarini aniq ajratish.** `src/lib/supabase.ts` dagi standart loyiha qiymatlari sabab noto‘g‘ri konfiguratsiya yashirinmasin. Development va production konfiguratsiyalarini belgilash; maxfiy server kalitlari mobil to‘plamga kiritilmasin.
- [ ] **README va versiyalarni yangilash.** README’da SDK 58 / RN 0.88 yozilgan, `package.json` esa Expo 57 / RN 0.86.3. Backend “hali ulanmagan” degan izoh ham joriy servislar bilan mos emas. Sozlamadagi `v1.3.1`ni loyiha `1.0.0` versiyasi bilan yagona manbaga bog‘lash.
- [x] **Lint ogohlantirishini bartaraf etish.** TTS `expo-audio`ga o‘tkazildi; eski `require()` olib tashlandi. Lint ogohlantirishsiz o‘tdi.
- [ ] **Muhim hisoblar uchun avtomatik testlar va CI qo‘shish.** Sana almashishi, streak, takror saqlash, SM-2, XP, auth va so‘rovlar ketma-ketligini qamrab olish. CI’da lint va typecheck bajarilsin; testlar uchun alohida buyruq bo‘lsin.
- [ ] **Mobil qurilmalarda asosiy oqimlarni tekshirish.** Kichik ekran, safe area, klaviatura, katta shrift, ekran o‘quvchi, Android back, internetsiz holat va uzun ro‘yxatlarni sinash. Uzun ro‘yxatlarda zarur bo‘lsa virtualizatsiya qo‘llash.
- [ ] **EAS chiqarish sozlamalarini tayyorlash.** Repoda `eas.json` yo‘q. Development/preview/production profillari, iOS bundle ID, Android package, build raqamlari, imzolash va do‘kon metama’lumotlarini tayyorlash. Tayyorlik mezoni: ikkala platforma uchun o‘rnatiladigan preview build olinadi.

## P3 — keyingi imkoniyatlar

- [ ] Tungi rejim va qo‘shimcha interfeys tillarini umumiy theme/tarjima tizimi orqali qo‘shish.
- [ ] Obuna kerak bo‘lsa, tariflar, huquqlar va xaridni tiklash oqimini mahsulot talablari asosida ishlab chiqish.
- [ ] Kontentni oflayn o‘qish va audio keshini hajm chegarasi bilan qo‘shish.

## Tavsiya etilgan bajarish tartibi

1. Progressni saqlash, kunlik hisoblar va takror yozish muammolari.
2. SDK mosligi, navigatsiya, auth va audio oqimlari.
3. Flashcard SM-2, JLPT natijalari va suhbat tarixi.
4. Sozlamalar, backend tekshiruvlari, qurilma sinovlari va EAS build.

## Joriy tekshiruv natijalari

- `npm run typecheck` — muvaffaqiyatli.
- `npm run lint` — 0 ta xato, 1 ta ogohlantirish (`src/services/tts.ts:98`, `@typescript-eslint/no-require-imports`).
- Qurilmadagi sinovlar va jonli backend tekshiruvlari bajarilmadi.
- Yuqoridagi natijalar dastlabki auditga tegishli. Keyingi kod o‘zgarishlari “Bajarilmoqda” bo‘limida qayd etilgan.

Ish boshlash qoidasi: Expo/React Native APIlariga tegishli koddan oldin `package.json` dagi Expo major versiyasiga mos hujjatlarni o‘qish. Hozirgi versiya: `58`; hujjatlar: https://docs.expo.dev/versions/v58.0.0/. Qo‘shimcha yo‘riqnomalar: https://docs.expo.dev/llms.txt. Har bir amalga oshirilgan o‘zgarishdan keyin lint va typecheck bajarish.
