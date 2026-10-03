import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nManager } from "react-native";
import { languageStore } from "./secure-store";

// Two live languages, Arabic first and right to left (i18n/languages.ts on the web). The strings are
// Modern Standard Arabic and plain English; nothing colloquial.
export type Lang = "ar" | "en";

const ar = {
  appName: "سوّق",
  loading: "جارٍ التحميل…",
  signIn: "تسجيل الدخول",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  signInHint: "حساب مزود الخدمة نفسه الذي أنشأته على sawwiq.org.",
  signingIn: "جارٍ تسجيل الدخول…",
  errInvalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  errMfa: "هذا الحساب يستخدم التحقق بخطوتين؛ ادخل من المتصفح حتى يدعمه التطبيق.",
  errStaff: "حسابات فريق العمل تستخدم لوحة الإدارة على الويب فقط.",
  errRateLimited: "محاولات كثيرة. حاول مرة أخرى بعد {minutes} دقيقة.",
  errNetwork: "تعذّر الوصول إلى الخادم. تحقق من الاتصال ومن عنوان الواجهة.",
  errStale: "تغيّرت المسودة من مكان آخر؛ أعدنا تحميلها.",
  errInvalid: "تحقق من الحقول ثم أعد المحاولة.",
  errUnavailable: "هذه الميزة غير متاحة الآن.",
  errGeneric: "حدث خطأ. حاول مرة أخرى.",
  errNotFound: "غير موجود، أو لا يمكنك عرضه.",
  upgradeTitle: "يلزم تحديث التطبيق",
  upgradeBody: "هذا الإصدار لم يعد مدعوماً. حدّث التطبيق إلى الإصدار {min} أو أحدث ثم أعد فتحه.",
  homeTitle: "صفحتك",
  visibility: { private: "خاصة", unlisted: "برابط فقط", public: "عامة" },
  setupStatus: "إعداد الصفحة: الخطوة {step} من 5",
  setupFinished: "اكتمل الإعداد. مشروعك الأول محفوظ.",
  setupNotOpened: "لم يبدأ الإعداد بعد.",
  continueSetup: "متابعة الإعداد",
  startSetup: "ابدأ الإعداد",
  openProject: "افتح المشروع",
  profile: "الملف الشخصي",
  settings: "الإعدادات",
  refresh: "تحديث",
  name: "الاسم",
  bio: "نبذة",
  services: "الخدمات",
  save: "حفظ",
  saved: "تم الحفظ.",
  back: "رجوع",
  next: "متابعة",
  step1Title: "١. عرّف بنفسك",
  step1Body: "الاسم والنبذة والخدمات هي ما يقرأه العميل أولاً.",
  step2Title: "٢. مصدر العمل",
  step2Body: "في هذه النسخة ترفع الصور من هاتفك. استيراد PDF أو Behance متاح على الويب.",
  sourceUpload: "صور من الهاتف",
  step3Title: "٣. لمن كان هذا العمل؟",
  clientPersonal: "مشروع شخصي",
  clientPrivate: "عميل لا أذكر اسمه",
  step4Title: "٤. المشروع",
  projectTitle: "عنوان المشروع",
  contribution: "ماذا قدّمت فيه؟",
  images: "الصور",
  pickImages: "اختر صوراً",
  uploading: "جارٍ الرفع…",
  remove: "إزالة",
  maxImages: "حتى {n} صور للمشروع الواحد.",
  step5Title: "٥. معاينة ونشر",
  blockerNoProject: "أكمل عنوان المشروع ووصف مساهمتك أولاً.",
  blockerNoServices: "اختر خدمة واحدة على الأقل.",
  blockerNoMedia: "أضف صورة واحدة على الأقل.",
  rights: "أملك حق عرض هذه الصور وهذا العمل.",
  publish: "حفظ المشروع",
  publishing: "جارٍ الحفظ…",
  published: "حُفظ مشروعك. تبقى صفحتك خاصة إلى أن تختار غير ذلك على الويب.",
  project: "المشروع",
  owner: "أنت المالك",
  language: "اللغة",
  languageNote: "يُطبَّق اتجاه الكتابة بعد إعادة فتح التطبيق.",
  signOut: "تسجيل الخروج",
  signOutAll: "تسجيل الخروج من كل الأجهزة",
  signOutAllHint: "ينهي كل جلسات حسابك، بما فيها هذا الهاتف والمتصفح.",
  about: "الإصدار {version} · الواجهة {api}",
  servicesPending: "خدمات بانتظار المراجعة: {n}",
};
const en: typeof ar = {
  appName: "Sawwiq",
  loading: "Loading…",
  signIn: "Sign in",
  email: "Email",
  password: "Password",
  signInHint: "The same provider account you created on sawwiq.org.",
  signingIn: "Signing in…",
  errInvalidCredentials: "The email or password is not right.",
  errMfa: "This account uses two-step verification; sign in from the browser until the app supports it.",
  errStaff: "Staff accounts use the web console only.",
  errRateLimited: "Too many attempts. Try again in {minutes} minutes.",
  errNetwork: "The server could not be reached. Check the connection and the API address.",
  errStale: "The draft changed elsewhere; it was reloaded.",
  errInvalid: "Check the fields and try again.",
  errUnavailable: "This is not available right now.",
  errGeneric: "Something went wrong. Try again.",
  errNotFound: "Not found, or not yours to see.",
  upgradeTitle: "Update required",
  upgradeBody: "This version is no longer supported. Update the app to {min} or newer and open it again.",
  homeTitle: "Your page",
  visibility: { private: "Private", unlisted: "Link only", public: "Public" },
  setupStatus: "Page setup: step {step} of 5",
  setupFinished: "Setup complete. Your first project is saved.",
  setupNotOpened: "Setup has not started yet.",
  continueSetup: "Continue setup",
  startSetup: "Start setup",
  openProject: "Open the project",
  profile: "Profile",
  settings: "Settings",
  refresh: "Refresh",
  name: "Name",
  bio: "About",
  services: "Services",
  save: "Save",
  saved: "Saved.",
  back: "Back",
  next: "Continue",
  step1Title: "1. Introduce yourself",
  step1Body: "Name, a short bio and your services are what a client reads first.",
  step2Title: "2. Where the work comes from",
  step2Body: "In this version you upload photos from your phone. PDF and Behance import are on the web.",
  sourceUpload: "Photos from the phone",
  step3Title: "3. Who was this work for?",
  clientPersonal: "Personal project",
  clientPrivate: "A client I will not name",
  step4Title: "4. The project",
  projectTitle: "Project title",
  contribution: "What did you do on it?",
  images: "Images",
  pickImages: "Choose images",
  uploading: "Uploading…",
  remove: "Remove",
  maxImages: "Up to {n} images per project.",
  step5Title: "5. Preview and save",
  blockerNoProject: "Fill in the project title and your contribution first.",
  blockerNoServices: "Choose at least one service.",
  blockerNoMedia: "Add at least one image.",
  rights: "I have the right to show these images and this work.",
  publish: "Save the project",
  publishing: "Saving…",
  published: "Your project is saved. Your page stays private until you choose otherwise on the web.",
  project: "Project",
  owner: "You own this",
  language: "Language",
  languageNote: "The writing direction applies after the app is reopened.",
  signOut: "Sign out",
  signOutAll: "Sign out of every device",
  signOutAllHint: "Ends every session of your account, this phone and the browser included.",
  about: "Version {version} · API {api}",
  servicesPending: "Services awaiting review: {n}",
};

export const STRINGS = { ar, en };
export type Strings = typeof ar;

type LangContext = { lang: Lang; t: (key: keyof Strings, vars?: Record<string, string | number>) => string; strings: Strings; setLang: (code: Lang) => Promise<void>; ready: boolean };
const Ctx = createContext<LangContext | null>(null);

const deviceDefault = (): Lang => (getLocales()[0]?.languageCode === "en" ? "en" : "ar");

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    languageStore
      .get()
      .then((saved) => {
        const code: Lang = saved === "en" || saved === "ar" ? saved : deviceDefault();
        setLangState(code);
        I18nManager.allowRTL(true);
        if (I18nManager.isRTL !== (code === "ar")) I18nManager.forceRTL(code === "ar");
      })
      .finally(() => setReady(true));
  }, []);
  const setLang = useCallback(async (code: Lang) => {
    setLangState(code);
    await languageStore.set(code);
    I18nManager.forceRTL(code === "ar");
  }, []);
  const value = useMemo<LangContext>(() => {
    const strings = STRINGS[lang];
    const t: LangContext["t"] = (key, vars) => {
      const raw = strings[key];
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
    };
    return { lang, t, strings, setLang, ready };
  }, [lang, setLang, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("LangProvider missing");
  return ctx;
}

/** A catalog name in the current language. */
export const nameIn = (lang: Lang, item: { name_ar: string; name_en: string }) => (lang === "ar" ? item.name_ar : item.name_en);
