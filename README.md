# 🇯🇵 Kaiwa.live — Mobile (Expo / React Native)

Figma dizayni asosida qurilgan **kaiwa.live** mobil ilovasi (yapon tili + JLPT
tayyorgarligi).

> Dizayn manbasi: `Kaiwa.live — Mobile UI UX` (Figma)

## ✨ Imkoniyatlar

| Bo'lim | Tavsif |
| --- | --- |
| **Splash → Login → Onboarding** | Daraja tanlash (N5–N1), kunlik maqsad, tayyorlik ekrani |
| **Home** | Salomlashish, XP / streak / so'zlar statistikasi, davom etayotgan dars, haftalik faollik, N3 progress |
| **Speak** | AI Speaking — Kaiwa AI bilan suhbat, mavzular, oxirgi suhbatlar tarixi |
| **Learn** | Darslar ro'yxati, o'rganish yo'l xaritasi, yutuqlar |
| **JLPT** | Daraja tanlagich, success plan, bo'limlar (Vocab/Grammar/Reading/Listening), mock imtihon |
| **Cards** | SM-2 usulidagi flashcardlar — flip, 4 darajali baholash, yakuniy hisobot |
| **Lesson Quiz** | Interaktiv testlar, tushuntirish bilan, natija ekrani |
| **Mock Test** | Tayyorlash → savollar → taymer → natija (o'tish/o'tmaslik) |
| **Settings** | Profil, bildirishnoma/ovoz sozlamalari, hisob bo'limlari |

Barcha ekranlar Figma'dagi dizayn tili asosida: **binafsha `#6C5CE7`**, oq
kartalar, och kulrang fon, pastda 5 ta tab (Home / Speak / Learn / JLPT / Cards).

## 🚀 Ishga tushirish

```bash
cd mobile
npm install
npx expo start
```

So'ng **Expo Go** ilovasini telefonida QR kodni skanerlang, yoki:

```bash
npm run ios      # iOS simulyator
npm run android  # Android emulyator
```

## 🛠 Texnikalar

- **Expo SDK 58** + **React Native 0.88.1** + **TypeScript**
- **React Navigation 7** (native-stack + bottom-tabs)
- **@expo/vector-icons** (Ionicons)
- `npm run typecheck` — TypeScript tekshiruvi

## 📁 Tuzilma

```
mobile/
├── App.tsx                    # Root: NavigationContainer + AppProvider
├── index.ts
├── src/
│   ├── theme.ts               # Rang, spacing, radius, typography, shadow
│   ├── navigation/
│   │   ├── types.ts           # Param list'lar
│   │   └── MainTabs.tsx       # 5 ta bottom tab
│   ├── components/            # Card, PrimaryButton, ProgressBar, ScreenHeader
│   ├── screens/               # Barcha ekranlar
│   ├── data/content.ts        # Darslar, kartalar, savollar (mock data)
│   └── store/AppContext.tsx   # XP, streak, sozlamalar holati
```

## 🔌 Backend va progress

Auth, darslar va progress Supabase servislariga ulangan. `.env.example` asosida
`.env` sozlang. Mobil ilovaga faqat public/publishable kalit qo‘yiladi.

Progress har bir hisob uchun qurilmada keshlanadi. Yuborilmagan o‘zgarishlar
diskdagi navbatda qoladi va faol ilovada 30 soniyada, ilovaga qaytganda yoki
“Qayta urinish” bosilganda serverga qayta yuboriladi. Dastlabki progressni
yuklash uchun internet kerak. Dars katalogi va audio hali to‘liq oflayn ishlamaydi.

Bir qurilmadagi qayta yuborish yakuniy qiymatlarni takror oshirmaydi. Bir hisobni
bir nechta qurilmada bir vaqtda ishlatishda konfliktlarni serverda hal qilish hali
qo‘shilmagan; eski qurilmadagi navbat yangi qiymatlarni bosishi mumkin.

## Tekshiruvlar

Node 22.18 yoki yangiroq versiyada:

```bash
npm test
npm run lint
npm run typecheck
```

Navbat testlari internet uzilishi, qayta ishga tushirish, kechikkan javoblar,
qurilmaga saqlash xatosi, hisoblar ajratilishi va darsni takror tugatishni qamraydi.
Keyingi ishlar `work.md`da keltirilgan.

## Mikrofon orqali AI bilan suhbat

Speak → mavzu tanlang → mikrofonni bosing → yaponcha gapiring → to‘xtatish
tugmasini bosing. Bir yozuv 45 soniyagacha davom etadi; keyin ovoz matnga
aylantirilib, AIga yuboriladi. Ruxsat, yozish va ulanish xatolari ekranda ko‘rsatiladi.

Audio `expo-audio` orqali ishlaydi. iOS/Android ruxsatlari `app.json`dagi config
plugin orqali sozlanadi; o‘z native ilovangiz uchun ushbu o‘zgarishlardan keyin
yangi build kerak. Brauzerda mikrofon HTTPS yoki `localhost`da ishlaydi.

Expo Go’da email/parol yoki mehmon rejimidan foydalaning. Google/Apple OAuth
uchun o‘z native build’ingiz kerak: callback `kaiwa://auth-callback` Supabase
redirect ruxsatlarida ko‘rsatilishi va telefonda tekshirilishi lozim. Expo Go’da
social login tugmalari shu sabab faollashtirilmaydi.

2026-11-19 kuni `http://localhost:8081`da haqiqiy mikrofon → yaponcha matn →
AI javobi oqimi va javobni ovozda qayta eshittirish tekshirildi. Native iOS/Android
qurilmalarida sinov hali bajarilmagan. `npm test` jami 18 ta testni qamraydi.
