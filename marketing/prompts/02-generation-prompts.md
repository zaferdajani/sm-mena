# Generation prompts (verbatim) and Higgsfield job IDs

All jobs belong to the owner's Higgsfield account; reuse an ID as `medias[].value` to build on an approved take. Models: `gpt_image_2_5` (quality high, 2k) for keyframes; `seedance_2_5` (omni_reference, 1080p, bitrate high, generate_audio true) for clips; `text2speech_v2` (ElevenLabs engine) for voice-over. The style bible (`00-style-bible.md`) is already folded into every prompt.

## A. Logo sting (brand lock pending owner approval)

Start and end frames are rendered from `tools/sting-lockup.html`: empty limestone start; exact mark and wordmark end.

| Take | Job | Verdict |
|---|---|---|
| A "Signature" (Seedance, 9:16) | `7de9100e-32a6-405d-a191-b4c7be3abdd0` | Rejected: a stray dot briefly reads «بس» ("enough") at 1.5 s |
| F "Signature" (FLUX 3 Video, 9:16) | `a8d2b180-7093-48e0-a048-61875711e8e8` | Clean picture, but the sound is weak and has a dropout. Kept as the alternate. |
| **B "Seal" (Seedance, 9:16)** | **`6649abd1-ba60-4e71-9afc-a030f9efa765`** | **Selected.** Last 0.7 s pinned to the exact logo. |
| **B "Seal" (Seedance, 16:9)** | **`bf6c5aee-b288-41cc-8e68-7cd190385f77`** | **Selected.** Pinned after the glint. |

**B prompt:**
> Minimal bright motion design animation, 4 seconds, static camera, one continuous shot. Pale limestone background. A deep green rounded square tile falls gently from above into the centre, touches down like a seal pressed onto paper, squashes a little and settles with one soft bounce, while a faint circular ripple of light spreads outward on the background. Then on the tile a white rounded wave line with three soft bumps draws itself from right to left, and a straight white line swipes in underneath. The dark green word shown in the end frame fades in below the tile. A soft diagonal glint crosses the tile and the image holds still, matching the end frame exactly. Crisp flat shapes, no particles, no extra text. Audio: soft air whoosh on the fall, a deep satisfying soft thud on touchdown, then a bright warm three-note rising plucked-string melody with a light bell on top, ending in a short airy shimmer. No voice, no speech, no drums.

The first B submission mentioning "rubber stamp" and "kanun" was blocked by Higgsfield's IP filter; the neutral wording above passed.

## B. Keyframes (gpt_image_2_5, high, 2k)

| ID | Job | Prompt (verbatim) |
|---|---|---|
| K01 9:16 | `c90c48b1-e10c-43ed-bead-87edcebaa755` | Photorealistic commercial photo, vertical. A Jordanian woman dentist in her mid-30s, warm face, light dusty-rose hijab fully covering hair, crisp white lab coat over a high-neck mint top, sits at the reception desk of a bright modern dental clinic in Amman, pale limestone wall, green plants, soft morning window light. She holds her smartphone with the screen facing her (screen not visible to camera), looking at it with a slightly tired, overwhelmed expression, eyebrows gently raised. Clean high-key daylight, airy, cheerful palette of limestone white, mint and bottle green. 50mm lens, shallow depth of field. No readable text, no letters, no logos, no watermark, natural hands with five fingers. |
| K01w 16:9 | `c7d016e1-323e-49bc-b52a-fc325351e2cd` | Same as K01, wide 16:9, subject on the right third of the frame with clean space on the left. |
| K02 9:16 | `0db2a82c-f544-4dc7-a400-3883b96bae26` | Photorealistic commercial photo, vertical. A Jordanian café owner in his late 30s with a neatly trimmed beard, rolled-sleeve light denim shirt and a bottle-green apron, stands behind the counter of his bright small café in Amman with pale limestone walls, wooden shelves, green plants and a coffee machine, morning sunlight. He looks down at his smartphone (screen facing him, not visible), with a curious, hopeful expression. Bright, cheerful, airy high-key daylight, limestone white, warm wood and bottle green palette. 35mm lens, shallow depth of field. No readable text, no signs, no logos, no watermark, natural hands. |
| K02w 16:9 | `b4cec51d-bd20-4c86-9036-4e58520cb916` | Same as K02, wide, subject on the left third. |
| K03 9:16 | `c7946de3-ced5-47aa-a0ba-f8893bedef86` | Top-down overhead flat-lay photo, vertical, on a long pale fine-grained limestone desk (#ECEBE4), soft warm morning daylight from the upper left, long soft shadows. Glossy square printed photographs of real marketing work lie in a loose scatter (a plated restaurant dish, a bright clinic interior, a perfume bottle, a small storefront, a latte art cup, a real estate villa), and in the centre a modern smartphone lies face-up with a completely plain blank white screen, thin dark bezel. Calm premium commercial product photography, bright and airy, lots of clean stone space. No people, no hands, no readable text, no letters, no logos, no watermark. |
| K03w 16:9 | `995503ff-8dac-4967-abb6-16ccaa18dc88` | Same as K03, wide, prints across the left and right. |
| K04 9:16 | `b20fedce-7dbe-4b2e-b48c-2cb77aeb8338` | Photorealistic premium still life, vertical, eye-level three-quarter angle. On a pale limestone desk in bright soft morning daylight sits a small closed deep bottle-green (#0E6B46) lacquered lockbox with a brushed steel clasp. Beside it a crisp sealed plain cream envelope and a neat printed checklist with three blank tick boxes and a black fountain pen. Airy, bright, calm, trustworthy, soft shadows, lots of clean space above for headline. No readable text, no letters, no logos, no watermark, no people. |
| K04w 16:9 | `428c7f08-bd75-450c-8a1e-950919d01f55` | Same as K04, wide, lockbox on the right third, space on the left for a headline. |
| K05 9:16 | `0ffbbe2a-478f-44ad-a725-491bf1266ff7` | Top-down overhead photo, vertical, pale limestone desk in bright morning daylight. Two hands (one in a white shirt cuff, one in a mint long sleeve) rest on either side of a crisp printed contract document with deep bottle-green tab dividers; one hand holds a black fountain pen about to sign on a blank signature line; next to it a short checklist with blank tick boxes. Calm, premium, trustworthy, bright and airy. Text on paper is only faint illegible grey lines. No readable text, no letters, no logos, no watermark, natural hands with five fingers. |
| K06 9:16 | `4fa97c51-6bab-46cb-8efc-6036f03c7866` | Photorealistic commercial photo, vertical. A small bright creative agency studio in Amman with pale limestone walls, big windows, plants and mood boards of colourful abstract photos. Three colleagues gather around a laptop on a wooden table: a young woman designer in a bottle-green hijab and cream long-sleeve top, a young man in a white t-shirt and overshirt, and an older bearded man in a light blue shirt. They look at the laptop screen (screen facing away from camera) with happy anticipation, the woman pointing at the screen. Bright, cheerful, high-key daylight. 35mm, shallow depth. No readable text, no logos, no watermark, natural hands. |
| K06w 16:9 | `55a2a410-cc09-4828-8fbd-2b9df8a5b572` → edited `a56605b8-0c94-40af-b14b-ebe2544452c9` | Same as K06, wide. **Edit:** "remove the flag and the flagpole from the sky … keep everything else identical". A blurred flag could read as either the Jordanian or the Palestinian flag, so it was removed to avoid any political reading. |
| K07 9:16 | `bed7b672-0dbf-4c4d-b0df-3c826f2544b7` | Photorealistic commercial photo, vertical. A Saudi business owner in his 40s wearing a crisp white thobe and a red-and-white shemagh with black agal, standing in his bright modern specialty café in Riyadh with contemporary Najdi-inspired architecture: textured sand-coloured walls, triangular window openings, warm wood, green plants, morning daylight. He holds his smartphone (screen facing him, not visible) and looks at it with a calm, confident, pleased expression. Bright, airy, premium, cheerful. 50mm, shallow depth. No readable text, no signs, no logos, no watermark, natural hands. |
| K08 9:16 | `54df3a2a-5bbe-4066-b7c5-08dfad1ff15d` | Photorealistic commercial photo, vertical. A bright modern marketing agency office in Riyadh with floor-to-ceiling windows, pale walls and green plants, morning daylight. A young Saudi woman in a black abaya and black hijab with a friendly face, and a young Saudi man colleague in a white thobe and white ghutra, sit side by side at a desk looking at a large monitor (screen facing away from camera, not visible), both smiling as good news arrives. Bright, cheerful, airy, professional, modest. 35mm lens. No readable text, no logos, no watermark, natural hands, no touching. |
| K09 9:16 | `dfa4f75b-4b02-4612-813b-1c88378ce5b6` | Photorealistic commercial photo, vertical. Early bright morning in Amman: a Jordanian woman boutique owner in her early 30s wearing a cream hijab and a long-sleeved sage green dress stands in the open glass doorway of her small clothing boutique on a sunny street of pale limestone buildings and stairs with bougainvillea, smiling softly as she opens for the day, racks of colourful clothes visible inside. Bright, cheerful, warm sunlight, airy. 35mm. No readable signs, no text, no logos, no watermark. |

## C. Clips (Seedance 2.5, start_image = keyframe)

Every clip prompt ends with: *"… Ambient … only, no voices, no speech, no music. No readable text, no logos."* All 16 passed frame review on the first take.

| Clip | Job | Motion prompt (core) |
|---|---|---|
| V01 9:16, 4 s | `ea1d8ba7-130e-4203-a495-75c560071f13` | She scrolls her phone with her thumb, pauses, exhales softly and rubs her temple, a little overwhelmed; the phone screen stays facing her … exactly one phone … slow push-in. |
| V10 9:16, 4 s | `93e22ad6-7ee0-4639-86be-73d68ebbb2cb` | She lowers her hand from her temple, taps her phone screen once, reads, and her face relaxes into a warm relieved smile; she leans back … slow gentle dolly in. |
| V01w 16:9, 4 s | `e27d5913-4b49-481b-bdc0-345da375ef36` | V01 + V10 in one beat (overwhelmed, then relieved). |
| V02 9:16 / V02w 16:9 | `9c81a44d-caff-498e-8500-7ef851c32c5d` / `46bcb6e4-3d18-4dd6-a08d-b088b16bc960` | He scrolls his phone, his eyebrows rise with pleasant surprise, he nods to himself and breaks into a genuine smile, then glances up toward the café … |
| V03 9:16 / V03w 16:9, 5 s | `f83800fc-14b0-4f03-b6d0-bc22c7cac205` / `2cadf8b8-0c2c-411f-a944-91e226ebd283` | The scattered prints glide smoothly … and settle into a neat tidy grid around the smartphone; the smartphone stays perfectly still with its plain blank white screen … camera slowly descends. |
| V04 9:16 / V04w 16:9, 5 s | `10f4559c-36f1-463d-b04a-46c498ed0d64` / `bbee1dc4-cc56-4bc9-9b88-781bbe663c76` | A hand in a mint long sleeve places the sealed envelope inside the green lacquered lockbox, closes the lid, the clasp clicks shut; the hand then ticks the first box of the checklist … |
| V05 9:16, 4 s | `ddd34ce2-5de1-4dca-9acb-b64020ce273a` | The hand signs a smooth short signature on the blank line of the contract with green tab dividers, then ticks the first checklist box … |
| V06 9:16 / V06w 16:9 | `715ac26a-3c5b-4803-83a2-9ef46e55fcc7` / `f3197e9e-a0df-4b28-a511-0a10736ed6b9` | The designer points at the screen and turns to the others with an excited smile, the older man gives a small satisfied fist pump … a good new client request has just arrived … no physical contact between the woman and the men. |
| V07 9:16 | `dfe833f8-f4e2-41e9-a341-1535f59b0093` | He scrolls his phone, gives a calm confident nod, smiles and lowers the phone, looking out over his café with satisfaction. |
| V08 9:16 | `ace1b42a-976d-49ec-9358-3ea0884b6653` | A new request appears on their monitor (screen faces away); she turns to him with a delighted smile and he nods approvingly … no physical contact. |
| V09 9:16 | `0b8f8b29-1b9a-4a0a-a614-63b223e94814` | She opens the glass door wider on a sunny Amman morning, steps back inside and switches on the warm lights; she smiles at the camera briefly … bougainvillea moving in the breeze. |

## D. Voice-over (text2speech_v2 · ElevenLabs engine)

Seed Audio preset voices were tested first and **rejected**: Whisper heard «حقيقي» ("real") as «هالكيكي» (gibberish) and dropped words. ElevenLabs transcribed back verbatim.

| Voice | Preset | Used for |
|---|---|---|
| **Yara** (female) | `fd25dc29-6495-5df3-9332-26bb58fdd575` | Hero, business, agency, payments, Jordan, English |
| **Orion** (male) | `ed69c516-92d2-4b30-a967-617737a342e5` | Saudi variant (Saudi white dialect) |
| Gideon, Marcus, Alistair (male) | tested | Not used: mispronounced ق as ط, or less clean |

Lines (placed at atempo 1.2 in Arabic, 1.1 in English):
- **H1** «بدّك وكالة تسويق… ومش عارف مين تختار؟» ("Need a marketing agency… and don't know who to pick?")
- **H2** «مع سَوِّق، شوف شغلهم الحقيقي، وأسعارهم.» ("With Sawwiq, see their real work, and their prices.")
- **H3** «أعمال حقيقية، لوكالات في بلدك.» ("Real work, from agencies in your country.")
- **H4** «جاوب على كم سؤال، والمطابق الذكي بيرشّحلك الأنسب.» ("Answer a few questions, and the AI matcher suggests the best fit for you.")
- **H5 (HOLD)** «وادفع على مراحل… المصاري بتستنّى موافقتك.» ("And pay in stages… the money waits for your approval.")
- **H6** «وكالات موثّقة، وعقود واضحة.» ("Verified agencies, and clear contracts.")
- **H7** «سَوِّق… أوّل منصّة عربيّة لوكالات التسويق.» ("Sawwiq… the first Arabic platform for marketing agencies.")
- **A1–A5** «شغلك حلو… بس مين شايفه؟» ("Your work is great… but who's seeing it?") / «على سَوِّق، اعمل صفحة لوكالتك مجاناً، وخلّي شغلك يحكي عنك.» ("On Sawwiq, make a page for your agency for free, and let your work speak for you.") / «استقبل طلبات عملاء حقيقيين، وقدّم عرضك.» ("Receive requests from real clients, and send your proposal.") / «وعقود على مراحل، بتحمي حقّك.» ("And contracts in stages that protect your rights.") / «سَوِّق… أنشئ صفحتك مجاناً.» ("Sawwiq… create your page for free.")
- **P1–P5** «الدفع على مراحل في سَوِّق، بيمشي هيك.» ("Paying in stages on Sawwiq works like this.") / «بتتفق مع الوكالة على عقد واضح، مقسّم لمراحل.» ("You agree with the agency on a clear contract, split into stages.") / «بتدفع كل مرحلة لطرف ثالث موثوق…» ("You pay each stage to a trusted third party…") / «وما بتوصل للوكالة، إلا لما توافق على الشغل.» ("And it only reaches the agency once you approve the work.") / «سَوِّق… ادفع وإنت مطمّن.» ("Sawwiq… pay with peace of mind.")
- **J1** «بعمّان في وكالات كتير… بس مين الصح؟ على سَوِّق، شوف شغلهم، قارن، واختار وإنت مرتاح.» ("In Amman there are lots of agencies… but which is the right one? On Sawwiq, see their work, compare, and choose with peace of mind.")
- **S1–S5 (Orion)** «تبي وكالة تسويق لمشروعك… وما تدري مين تختار؟» ("You want a marketing agency for your business… and don't know who to pick?") / «في سَوِّق، شف شغلهم الحقيقي وأسعارهم، قبل لا تدفع.» ("On Sawwiq, see their real work and prices, before you pay.") / «جاوب على كم سؤال، والمطابق الذكي يرشّح لك الأنسب في الرياض.» ("Answer a few questions, and the AI matcher suggests the best fit for you in Riyadh.") / «وكالات من الرياض وجدة والدمام، كلها قدّامك.» ("Agencies from Riyadh, Jeddah and Dammam, all in front of you.") / «سَوِّق… أوّل منصّة عربيّة لوكالات التسويق.» ("Sawwiq… the first Arabic platform for marketing agencies.")
- **E1–E7 (English)**: "Need a marketing agency, but don't know who to pick?" … "Sawwiq. The first Arabic marketplace for marketing agencies."

The owner chooses the voices by ear. Until then every film also works muted, because the captions mirror the voice-over.
