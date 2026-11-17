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

- **Expo SDK 58** + **React Native 0.88** + **TypeScript**
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

## 🔌 Backend ulash

Hozircha ma'lumotlar `src/data/content.ts` da (demo rejim). Web ilovadagi
Supabase backendiga ulash uchun:

1. `src/services/api.ts` yarating
2. `@supabase/supabase-js` o'rnatib, `.env` ichida `EXPO_PUBLIC_SUPABASE_URL`
   va `EXPO_PUBLIC_SUPABASE_ANON_KEY` ni belgilang
3. `AppContext` ni real ma'lumotlar bilan almashtiring
