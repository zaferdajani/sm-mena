# 37 · App development, and trying an agency's apps in the sandbox

## The service

`app_development` ("Mobile and web app development" / «تطوير تطبيقات الجوال والويب») is a core service in the **digital** category (`data/service-taxonomy.json`, `lib/taxonomy.ts`), with its own hire page copy (`data/hire-content.json`), matchmaker keywords (`lib/ai/extract.ts`: app, تطبيق, ابلكيشن, iOS, Android, Flutter…), a place in the match wizard's digital group, and the catalog tag `mobile_app_development` re-parented under it. An app is part of online marketing now: a direct channel with no algorithm in between, so businesses can find who builds them where they find who runs their pages.

## Apps in a portfolio

A post can carry **the app it shows** (`posts.app`, `lib/app-demo.ts`): name, what it runs on (web / iOS / Android / both), the **version** (one post per version keeps the history), the store page, the web address, and a **"Try the app" link**.

- Studio → New post / edit post → "This post shows an app": the fields above. The account field files the post under the client the app was built for (docs/28).
- The post page shows the app panel: name, kind, version, **Try the app**, store and web links. The feed card shows a compact row.

## Trying the app: the app mall's sandbox

The sandbox is the owner's **app mall** (PCN, `github.com/zaferdajani/app-mall`, live at `pcn.store` / `pcn-api.fly.dev`): developers deploy an app there; visitors run the real app in an isolated frame, never seeing its code. Sawwiq does not run any sandbox itself (it is serverless on Vercel); it **frames** the app mall's demo:

1. The agency deploys and publishes the app on the app mall, then creates an **embed key** whose allowed origins include `https://sawwiq.org` (PCN: `POST /api/dev/apps/:id/embed {origins}`; the embed URL is `https://pcn.store/embed/<key>/`).
2. The agency pastes that embed link into the post's "Try the app" field. `cleanApp()` accepts **only https links on the app mall's hosts** (`APP_MALL_HOSTS`, default `pcn.store,pcn-api.fly.dev`, subdomains included); anything else is refused with an error, so no post can frame an arbitrary site.
3. A visitor presses **Try the app**: a full-screen frame (`components/post/try-app.tsx`) loads the embed link. The frame is sandboxed on our side (`allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock`, no `allow-same-origin`), and the app mall sets its own `frame-ancestors` and `sandbox` headers, so nothing on Sawwiq can loosen its containment. The app mall starts an anonymous demo session for the embed key (origin-checked, quota-checked, watermarked) and serves the app.

What the app mall operator (the owner) must set once: `PCN_ALLOWED_ORIGINS` on the PCN server must include `https://sawwiq.org` (its `frame-ancestors` come from that list); each developer then allows `https://sawwiq.org` on their own embed key. Both are documented in the post form's hint.

## Guards

- Only app-mall hosts can be framed (server-side check, plus the client-side `sandbox` attribute).
- Links open with `rel="nofollow noopener noreferrer ugc"`.
- The demo runs on the app mall's quota and plan (its `meter`), not on Sawwiq's; a developer whose plan does not include embedding gets no embed link to paste.
- Nothing is installed on the visitor's device; the UI says so.
