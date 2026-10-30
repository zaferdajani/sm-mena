# Council seat: Arabic-first mobile UI and visual design

Scope: what the agency sees and taps on a 390 px phone in Arabic, from `/ar/join` to a public page. Evidence: `walkthrough.md`, shots `02`–`23` (plus `28`, `29`, `70`), and the source files named below. No repo files were changed.

## The short version

The flow does not look broken. It looks busy. Every screen carries four layers of chrome (English banner, a five-control header, a stepper, a footer with a build stamp) around a small amount of real work. The main button is a small pill at the bottom of the content, never in the thumb zone, and on most screens it sits under a scroll. Errors come from the browser in English, or as a banner the user cannot see. And the moment of success ("Save my portfolio") is not a success: the page is still a 404 to the world (`20`).

Careem, Talabat and Noon onboarding share four habits that this flow lacks:
1. One question per screen, with a full-width sticky primary button at the bottom.
2. Nothing on screen that is not about the current step (no footer, no nav, no country picker).
3. Errors under the field, in Arabic, the moment you leave it.
4. A real "you're live" moment with a link you can share on WhatsApp.

---

## Part 1. Problems that hit every screen

| # | What | Where | Verdict | Why |
|---|---|---|---|---|
| G1 | English "Sawwiq is available in English. …" bar on every Arabic page | all shots `02`–`40`; `components/language-offer.tsx` | **Cut in focused flows; redesign elsewhere** | It is English, LTR and truncated, so its own action ("Show it in English") is cut off by `truncate` on the `<p>` that holds the button. The user sees half a sentence and an X. The header already has an "English" button (`07`), so it is a duplicate. Hide it on `/join`, `/portfolio-setup`, `/studio/*`. Where kept, put the action in its own button outside the truncated text. Note: many Jordanian phones run in English, so real users will see this, not only the test browser. |
| G2 | Header in the wizard: country select, location icon, bell, help, "English" | `07`–`17` | **Cut to logo + "أكمل لاحقاً" + help** | Five controls compete with the step. Country is irrelevant here. In a focused flow the header should be about 56 px, not about 110 px. |
| G3 | Footer with "registration-setup-2026-09-29" stamp shown twice, legal links, "Contact us" | bottom of `07`–`17` | **Cut in the wizard; keep the stamp out of user view** | A build stamp is staff data. The footer pushes the real end of the page further down and makes the page feel endless. |
| G4 | Primary button: small pill (`min-h-11 px-5 text-sm`), at the end of the row, not sticky | `Nav` in `components/setup/wizard.tsx` L167; `07`, `13`, `16` | **Redesign** | In RTL `justify-between` puts the primary at the visual left, the far side for a right thumb, and after the content, so it is usually below the fold (step 1: button at y≈1100 on an 844 screen in `07`). Use a sticky bottom bar: full-width primary (48–52 px tall, 16 px text), "Back" as a quiet text button or a chevron in the top bar. Add `pb-[env(safe-area-inset-bottom)]`. |
| G5 | Validation: browser bubbles in English ("Please fill out this field") | join `03`, `06`; `join-form.tsx` `reportValidity()` L124–127 | **Redesign** | The bubble is English, small and lands in the wrong place in RTL (in `03` it floats over the next label). Use `noValidate`, check with the shared Zod schema, write Arabic text under the field in red, set `aria-invalid` + `aria-describedby`, red border, scroll to the first error. Check on blur, not only on Continue. |
| G6 | Wizard error banner at the top while the button is at the bottom | `14`; `wizard.tsx` L111 | **Redesign** | After tapping "معاينة" the error is off screen; nothing visibly happens. Generic "Something in this step isn't right" for an empty client name (step 3) names no field. Put the message under the field, and a short toast just above the sticky bar. |
| G7 | Native file inputs: "No file chosen Choose File" in English, LTR order | `10` (PDF in import panel); `wizard.tsx` L337 | **Redesign** | The avatar and photo pickers already use the right pattern (hidden input + styled label). Do the same for PDF: a button "اختر ملف PDF" with an icon; after picking show the file name in an LTR-isolated chip (`<bdi>`), with size and a remove X. Same fix in `post-form.tsx`, `profile-form.tsx`, `client-form.tsx` if any show native text. |
| G8 | Mixed-direction text: "بيهانس (Behance)؟" breaks so the bracket and question mark land on the wrong line | `02`, `05`, `18`; `messages/ar.json` L3596, L3667, L3671 | **Rename + isolate** | Drop the doubled name. Write "Behance" once, wrapped in `<bdi>` (or `⁨…⁩` in the string), with its logo. E.g. "لديك أعمال على ‏Behance؟". Do the same for any Latin brand inside Arabic sentences (Google, PDF, SEO, WhatsApp). |
| G9 | Floating "مساعدة" button over content | `18`, `19`, `21`, `23` | **Move** | It covers the page heading and body text on the studio pages. In focused flows, move help into the top bar (icon). Elsewhere, shrink to a 48 px round icon and keep it clear of a sticky action bar (it is `fixed end-4 bottom-…` in `components/support/help-chat.tsx`; it will collide with G4 unless it moves). |
| G10 | Bottom nav (Home / Example page / Studio) inside the wizard and over studio pages | `18`, `19`, `23` | **Cut in the wizard** | It is a way out of a task you are trying to finish. Keep in Studio. |
| G11 | Arabic type size | wizard body `text-sm` (14 px), stepper labels `text-[11px]` (`wizard.tsx` L138) | **Raise** | Noto Sans Arabic at 11 px is below comfortable reading; Arabic glyphs read smaller than Latin at the same size. Body 16 px, helper 14 px, minimum 12 px anywhere, line-height 1.7–1.8 (already `leading-7` on bodies, good). Keep headings bold 20–22 px. Line length at 390 is fine. |
| G12 | Iconography | source cards `09`, finish card `17`, studio cards | **Add** | Source cards are text-only boxes of equal weight. One lucide icon per card (Upload, FileText, Link) and a 2-word title makes them scannable. Use one icon set; the ✓ in stepper labels is a text character, use the `Check` icon like the join rail does. |
| G13 | Checkbox sizes differ | join: big card checkbox (`05`); wizard rights: bare 16 px box (`16`); publication ack: bare box (`19`) | **Unify** | Use the join card style everywhere: whole card is the tap target, 24 px box, `accent-primary`. |
| G14 | Disabled primary at 60% opacity | `16` "احفظ معرض أعمالي" | **Redesign** | Pale green reads as broken. Keep the button enabled; on tap, shake/scroll to the unticked box with an inline message. |
| G15 | Loading and success | `wizard.tsx` shows "saving" text only; upload 1.9 s; PDF 6 s; Behance up to 8 s; publication "تم حفظ اختيارك" hidden under the help FAB (`21`) | **Add states** | Per-photo progress on thumbnails; PDF progress "صفحة 2 من 3"; Behance skeleton + "إلغاء". Success as a toast near the bottom bar, not text at the top of a long card. |
| G16 | Dark mode | tokens exist in `app/globals.css` L59+; no dark shots captured | **Verify before ship** | Check `02`, `07`, `13`, `16`, `18` in dark. Risks: the photo collage behind the join card, `registration.css`/`brochure*.css` hard-coded colours, `text-white` on the nav badge (`studio-nav.tsx`), the yellow early-registration notice border, image thumbnails with no frame on a dark card. Note: CLAUDE.md says dark follows the OS; `globals.css` also supports a `data-theme` toggle. Fine, just test both. |

---

## Part 2. Screen by screen

### Join step 1 "صفحتك" (`02`, `03`; `join-form.tsx`, `join/page.tsx`)
| Element | Verdict | Why |
|---|---|---|
| Logo on photo collage | Keep, shrink | 120 px of decoration above the form. 48 px logo row is enough. |
| Big heading "جهّز صفحتك من البداية." | Keep, rename | Shorter and active: "أنشئ صفحتك في دقيقتين". Promise a time; it lowers the bar. |
| 3-step rail with tiles | Merge | Rail + "الخطوة 1 من 3 · صفحتك" + the sessionStorage note say the same thing three times (~200 px). Replace with one thin progress bar and "1 من 2" (see flow). |
| "ما تكتبه يبقى على جهازك…" | Cut from view | True and nice, but it is reassurance nobody needs before typing. Keep the behaviour. |
| Agency name | Keep | `dir="auto"` good. Add live preview of the handle below it. |
| Username | Merge into name | Auto-generate from the name (transliterated), show "sawwiq.org/a/‏nakhla" as an LTR chip with a pencil to edit. Check availability inline with ✓ / "محجوز". Removes one of the hardest fields for Arabic speakers (Latin-only, rules unknown). |
| Country + City | Defer | Prefilled Jordan / Amman and almost never changed at sign-up. Ask in the profile step or infer. `country` column default `JO` already exists. |
| "Continue" | Redesign | Sticky full-width (G4). |
| Early-registration notice (yellow) | Cut from join | Repeated on join, studio header and every studio page. Say it once, on the final "publish" choice, in one line. |
| Behance hint box | Cut here | Six Behance entry points (walkthrough). Keep only one, inside "add your work". |
| "لديك حساب؟ سجّل الدخول" | Keep | Move to the top bar so it is visible without scrolling. |

### Join step 2 "الفريق والخدمات" (`04`; 2180 px tall)
| Element | Verdict | Why |
|---|---|---|
| Agency / freelancer radio | Keep, restyle, move | Two compact segmented chips at the top of step 1 ("وكالة" / "مستقل"). One tap, no paragraph. |
| "Who is on your team?" 10 chips | Defer | Useful for matching, not for getting a page up. Ask in Studio → Page, or as one optional card after publishing. |
| "Add another specialty" search + 2 notes | Defer | A second taxonomy on the same screen; heavy text. |
| "What do you offer?" search + 8 chips | Cut here | Asked again in wizard step 1 and again per project (step 4). Ask once, on the project, and roll up to the profile (see flow). |
| Whole step | Cut | Nothing on it is required (walkthrough). Removing it saves one screen and the longest page in the flow. |

### Join step 3 "التواصل وتسجيل الدخول" (`05`, `06`)
| Element | Verdict | Why |
|---|---|---|
| WhatsApp with +962 select | Keep | RTL placement is right (code on the visual left, number LTR). Add `inputMode="tel"`, format as you type (07 9xxx xxxx), accept a leading 0. |
| Agent code (optional) | Defer / hide | Collapse behind "لديك رمز مندوب؟" link; prefill from `?ref=` silently. An empty optional field mid-form slows everyone. |
| Email | Keep | `inputMode="email"`, LTR (already). |
| Password | Keep, improve | Show/hide eye; show "8 أحرف على الأقل" under the field before the user types, not as an error after. |
| Terms + contact-display box | Keep (required, versioned consent) | Make the link a clear inline link ("الشروط وسياسة الخصوصية"), not a lone "↗" on its own line. |
| 18+ box | Keep (required) | Same card style, directly under consent. Can share one bordered group but stays a separate checkbox. |
| "إنشاء الصفحة" | Keep the words, redesign the button | Sticky full-width. Pending state: spinner + "جارٍ الإنشاء…". |
| Early-registration notice + Behance box below | Cut | See step 1. |

### Wizard step 1 "الملف" (`07`, `08`; `ProfileStep`)
| Element | Verdict | Why |
|---|---|---|
| "الخطوة 1 من 5" + "أكمل لاحقاً" + 5-segment stepper with 11 px labels | Redesign | One bar, no labels, "1 من 3" text; "أكمل لاحقاً" moves to the top bar. |
| Logo upload with initials avatar | Keep, move later | A good-looking avatar is motivating, but it is better in the final profile/preview step, next to the live preview. |
| Name (prefilled) | Cut here | Already given 30 seconds ago. Editable in preview. |
| Short intro | Move | Into the preview step with a suggested sentence built from services + city ("نصمم … في عمّان") the user can accept. |
| Services (second time) | Cut here | See join step 2. |
| "لاحقاً" skip link | Cut | With the step gone, so is the skip. |

### Wizard step 2 "المصدر" (`09`, `10`, `11`; `SourceStep`)
| Element | Verdict | Why |
|---|---|---|
| Three equal cards | Redesign | Upload is the path 90% will take; make it the screen. Not a choice. |
| "Upload my files" card copy "تضيفها في الخطوة 4" | Cut | Tells you to wait two steps to do what you came to do. |
| Import card (PDF + Behance) | Merge into one secondary link | "عندك ملف PDF أو مشروع على Behance؟ استورده" under the upload area, opening a bottom sheet. Only entry point for Behance in the flow. |
| Social connect card + 5 "غير متاح بعد" panels | Cut | 5 dead ends, 1600 px of "not available" (`11`). Show nothing until at least one platform works. |
| "تابع بالرفع" while Import is open | Fix | The label contradicts the open panel (`10`). Goes away with the redesign. |

### Wizard step 3 "العميل" (`12`; `ClientStep`)
| Element | Verdict | Why |
|---|---|---|
| Example line "مقهى افتراضي ← حملة…" | Cut | The arrows read as UI, and it is a lesson, not a question. |
| Three radio cards | Merge into the project screen | One text field "لمن كان هذا العمل؟" plus two small chips under it: "عمل شخصي" / "عميل سرّي". Picking a chip greys out the field. Same data, a third of the height, one screen less. |
| Generic error on empty name | Fix | Inline "اكتب اسم العميل أو اختر «عميل سرّي»". |

### Wizard step 4 "المشروع" (`13`, `14`, `15`; `ProjectStep`)
| Element | Verdict | Why |
|---|---|---|
| "أضف صوراً" small button | Redesign | Make photos the hero: a full-width dashed drop zone, 4:3, with an image icon and "أضف صور العمل" — first thing on screen. On phone, open the gallery directly. |
| Thumbnails with ↑ ☆ ↓ ✕ (4 × 44 px buttons) | Simplify | Up/down arrows in a 2-column grid are ambiguous, more so in RTL. Keep ✕ and a "الغلاف" badge on the first; tap a photo → bottom sheet "اجعلها الغلاف / احذف". Drag to reorder as a bonus. |
| "1 إلى 10 صور…" two helper lines | Shorten | "صورة واحدة تكفي. تبقى خاصة حتى تنشر." |
| Project name | Keep | Placeholder good. |
| "دورك، بجملة أو جملتين" textarea | Keep, shrink, offer chips | 2 rows, with tap-to-insert starters ("صممت…", "صوّرت…", "أدرت الحملة…"). Required, so it must be easy. |
| Services this work shows + "خدمات أخرى" (~30) | Keep (ask once, here) | Show 6 best guesses as chips; "المزيد" opens a searchable bottom sheet, not a native `<details>` with a ◄ marker. These roll up into the profile's services so the profile never asks again. |
| "شاهد مثالاً حقيقياً" | Move up, shrink | A small "مثال" link next to the heading opening a sheet. Good idea, wrong place (after the fields). |
| "معاينة" | Redesign | Sticky. Error inline (G6). |

### Wizard step 5 "المعاينة" (`16`; `PreviewStep`)
| Element | Verdict | Why |
|---|---|---|
| Card preview | Keep, upgrade | Show the real top of the public page (avatar, name, @handle, city, first project), so editing the name/logo/intro happens here, in context. |
| Three edit buttons | Replace | Tap the thing to edit it (pencil on avatar, name, project). |
| Visibility note + "اختر من يشاهد صفحتي" link to another page | Merge | Put the choice here as two big cards: "انشر صفحتي الآن" / "أبقها خاصة الآن". Third option ("لمن معه الرابط") under "خيارات أخرى". Default stays the registration-phase default (private) unless the owner decides otherwise; the point is the choice is one tap on this screen, not a separate page. |
| Rights checkbox (bare 16 px) | Keep, restyle, merge text | One card checkbox: "من حقي عرض هذا العمل، والوصف صحيح، وأوافق على الظهور الذي اخترته." This merges the publication acknowledgement (`19`) so it is still captured. Legal should confirm the merged wording. |
| "احفظ معرض أعمالي" | Rename by choice | "انشر صفحتي" if public is chosen, "احفظ صفحتي" if private. The label already switches on `visibility` (L678); the user just never gets to pick here. |

### Wizard finished (`17`)
| Element | Verdict | Why |
|---|---|---|
| "حُفظ مشروعك الأول" card with 5 buttons of near-equal weight | Redesign | No hierarchy; the most important next step ("choose who can see") is a grey button. New screen: big check, "صفحتك جاهزة", the link as an LTR chip with "نسخ", primary "شارك على واتساب", secondary "شاهد صفحتي", tertiary "أضف مشروعاً آخر". If private: primary is "انشرها الآن" (one tap, ack already captured). "Add another client" goes to Studio. |

### Studio home (`18`, `70`; `studio/layout.tsx`, `page.tsx`)
| Element | Verdict | Why |
|---|---|---|
| Account card with logout + "عاين صفحتك" | Keep, compact | Logout belongs in Security/menu, not the first card. |
| Early-registration notice | Cut on home (keep one line on Publication) | Third repeat. |
| Tab strip (9+ tabs, cut off both sides, also at 1280 `70`) | Redesign | On phone: 4 tabs max ("صفحتي", "أعمالي", "الرسائل", "المزيد") with "المزيد" opening a sheet listing the rest. If a scroller stays, add an edge fade (direction-aware mask) and `scroll-padding-inline` so the first tab is not clipped on load (`studio-nav.tsx` centres the active tab, which clips the first one). |
| "ابدأ بهذه الخطوات" with 3 ticks right after the wizard | Fix | "اختر ظهور صفحتك" ticks while private. A ticked list that is all done should collapse to one line; a real "Your page is private — publish" card should show until the user decides. |
| Behance card ("(Behance)?" wrap) | Cut on home | Lives in "أضف أعمالك". |
| "من يستطيع مشاهدة صفحتك؟" | Keep, promote | This is the most important status; make it the first card with a coloured state pill (خاصة / منشورة). |
| Pioneer benefit status | Defer / collapse | Dense legal text; one line + "التفاصيل". |
| "أضف أعمالك" primary + 2 secondaries | Keep primary, sticky on phone | |
| Help FAB overlapping heading | Fix | G9. |

### Publication settings (`19`, `21`)
| Element | Verdict | Why |
|---|---|---|
| Whole page as the only way to go public | Merge into wizard preview + studio status card | Keep the page for changing the choice later. |
| Three radio cards with 3–4 lines each | Shorten | Title + one line each; the longer explanation in "اعرف المزيد". |
| Ack checkbox with native bubble | Restyle + inline error | G5, G13. |
| Small print about previous copies | Keep, collapse | Legal detail, not first-read. |
| "تم حفظ اختيارك" under the FAB | Fix | Toast near the button + state pill on studio home. |

### Public profile (`22`, `23`)
| Element | Verdict | Why |
|---|---|---|
| Header card, badge, handle, city | Keep | Looks good; the handle is LTR-correct. |
| Contact box: "واتساب" + "اتصال" + "مشاركة الصفحة" + "WhatsApp" | Rename | Two WhatsApp buttons, one in English. The second (share) should read "شارك عبر واتساب" with a share icon, or fold into "مشاركة الصفحة". |
| Country select shows "..." in the header (`23`) | Fix | Truncated to nothing at 390. Show the flag only. |
| Tabs strip "الأعمال / العملاء / …" partly hidden by the Help FAB | Fix | G9. |
| 1-column grid with one small card | Redesign (later) | Instagram-style means a 2- or 3-column square grid on phone; a single half-width card with lots of empty space looks unfinished. |

---

## Part 3. Ideal redesigned flow (390 px, Arabic)

Shell for all four screens: top bar 56 px = back chevron (start side) · logo · "أكمل لاحقاً" / help icon (end side). A 4 px progress bar under it. No footer, no bottom nav, no English banner, no FAB. Sticky bottom bar with one full-width primary button (52 px) above the safe area. Inline Arabic errors. 16 px body.

**Screen 1 — "أنشئ صفحتك" (1 of 3).** Segmented chips: وكالة | مستقل. Fields: اسم الوكالة (with live "sawwiq.org/a/‏…" chip, editable, availability ✓), رقم واتساب (+962), البريد الإلكتروني, كلمة المرور (eye toggle, rule shown upfront). Two card checkboxes: consent (versioned, link inline) and 18+. "لديك رمز مندوب؟" link. Sticky: "أنشئ صفحتي". → account created.

**Screen 2 — "أضف عملاً واحداً" (2 of 3).** Hero photo drop zone (opens gallery). After pick: thumbnails with cover badge and upload progress. Fields: اسم المشروع; "لمن؟" text with chips [عمل شخصي] [عميل سرّي]; "دورك" (2 rows, starter chips); service chips (6 guesses + "المزيد" sheet). Under the drop zone: "عندك PDF أو Behance؟ استورد" (bottom sheet; the only import entry). Sticky: "التالي".

**Screen 3 — "هكذا ستظهر صفحتك" (3 of 3).** Live preview of the public page top: tap avatar to add a logo, tap name to edit, intro prefilled from services + city (editable), city chip (عمّان, editable). Two big choice cards: "انشرها الآن" / "أبقها خاصة الآن" (+ "خيارات أخرى" for link-only). One card checkbox (rights + visibility ack). Sticky: "انشر صفحتي" or "احفظ صفحتي".

**Screen 4 — "صفحتك جاهزة".** Check icon, link chip + "نسخ", primary "شارك على واتساب", "شاهد صفحتي", "أضف مشروعاً آخر", and a soft card "أكمل ملفك لاحقاً: الفريق، الباقات، العملاء" → Studio.

Rough count on the shortest path: 4 screens, about 9 taps (CTA, create, add photos + pick, chip or nothing, next, choice, checkbox, publish), 8 typed entries, 1 page load after sign-up. Today: 12 screens, 19 clicks, 15 required fields, 5 navigations. Team roles, specialties, agent code, country, logo and intro all become optional, later or prefilled.

What stays untouched: Arabic default + RTL, both locales, versioned consent, separate 18+ box, private-by-default can stay the preselected option if the owner wants (one tap to change, on the same screen), providers optional (upload works with local disk; Behance/PDF are secondary), briefs and matching unaffected.

---

## Part 4. Ranked changes

| Rank | Change | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | Put the visibility choice + merged acknowledgement on the wizard's last screen; button says "انشر صفحتي"; success screen with link + WhatsApp share | Very high: fixes "I saved but nobody can see it" | M | Low-med: docs/51 registration-phase rules and legal wording of the merged ack need sign-off |
| 2 | Sticky full-width primary button + focused shell (no footer, bottom nav, FAB, banner, country/bell in `/join` and `/portfolio-setup`) | High: every screen feels shorter and the next step is always under the thumb | M (shared layout + `Nav`) | Low; must move the Help FAB so it does not cover the bar |
| 3 | Inline Arabic validation (`noValidate` + Zod messages under fields, errors next to the button, field-specific texts) | High: removes English bubbles and silent failures (`03`, `06`, `14`) | M | Low; needs both message files |
| 4 | Cut join step 2; ask services once on the project; auto-generate handle; defer country/city/team roles/agent code | High: removes the longest screen and two repeats | M | Medium: matching uses services/roles, so the project's services must roll up to the agency; e2e updates |
| 5 | Merge Source + Client + Project into one "add one work" screen with a photo hero; drop the social-connect card; single Behance/PDF entry | High | M-L | Medium: wizard state machine (`goToStepAction`, versions) changes |
| 6 | Hide the English language banner in focused flows; fix its truncation so the action is visible | Medium: first impression of every Arabic page | S | Low |
| 7 | Bidi isolation for Latin brand words ("Behance", "PDF", "SEO") and drop "بيهانس (Behance)" doubling | Medium (polish, trust) | S | None |
| 8 | Replace the visible native PDF input with a styled Arabic picker; show file name in an LTR chip | Medium | S | None |
| 9 | Typography: 16 px body, ≥12 px everywhere, stepper labels removed; one checkbox style (card); icons on choice cards | Medium | S | Low (visual regression only) |
| 10 | Studio nav: 4 tabs + "المزيد" sheet on phone; edge fade; no clipped first tab; honest checklist; visibility status card first | Medium | M | Low-med: many studio routes link to tabs |
| 11 | Loading and success states (upload progress per photo, PDF page progress, Behance cancel, toasts near the action) | Medium | S-M | Low |
| 12 | Public profile: one WhatsApp button + Arabic share label; flag-only country in header; 2-3 column work grid | Medium (what the agency shows its clients) | S-M | Low |
| 13 | Dark-mode pass on the redesigned screens (collage, notices, badges, thumbnails) | Low-med | S | Low |
| 14 | Hide the build stamp from users | Low | S | None |

Every new string goes in both `messages/ar.json` and `messages/en.json`; all spacing uses logical properties (`ps/pe/ms/me`, `start/end`, `inset-inline`), including the sticky bar, the FAB and the nav fade.
