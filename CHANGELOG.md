# ThinkViva - Changelog

## [2026-05-10] Comprehensive Redesign - Brand, Layout & Content

### New Pages
- `public/about.html` - About Us page: mission, values, team placeholder, CTA
- `public/pricing.html` - Pricing placeholder: 3-tier package cards (Starter/Standard/Premium), coming soon copy
- `public/terms.html` - Terms & Conditions: 10-section boilerplate with Agree/Decline buttons

### Routes Added (`src/server.js`)
- `GET /about` → serves `public/about.html`
- `GET /pricing` → serves `public/pricing.html`
- `GET /terms` → serves `public/terms.html`

---

### `public/index.html` - Full Page Restructure

**Navigation**
- Nav order updated: Subjects | How It Works | Apply to Teach | About Us | Contact Us | Pricing
- "Feedback" link replaced with "Contact Us" (anchor to `#contact`)
- "Pricing" link added → `/pricing`
- "About Us" link added → `/about`
- Logo now shows "Smart Learning for Growing Minds" tagline beneath brand name

**Hero Section**
- Removed: "Pilot - First 10 Families" badge
- Removed: "Where Every Child Shines." tagline pill
- Added: Country flags row at top - 🇳🇬 🇨🇦 🇺🇸 🇦🇺 🇦🇪 (Nigeria, Canada, USA, Australia, UAE)
- New headline: "Fostering exceptional education and bridging learning gaps for every child."
- New body copy: 3-sentence expert tutor description with 24hr matching, homework support, diaspora families messaging
- Trust items moved inline below CTAs (3 items: Expert-led 1-1 / Live on GoogleMeet/Zoom / Flexible schedule + homework support) - replaced full-width dark teal trust row
- Hero right panel: replaced grade-picker card with `.hero-visual` containing 4-stat infographic (24hrs / 45min / P1–P6 / 1-on-1) + grade pills + footnote
- Grade pills extended to include Primary 6
- Added italic footnote: "Grade level coverage will expand as demand for tutors and database of teachers increase."
- Booking modal grade select updated to include Primary 6
- UAE added to country dropdown in booking modal

**Removed Section**
- Full-width `<section class="trust-row">` removed (trust items now inline in hero)

**New: Benefits Section** (between Hero and Subjects)
- Dark teal background, 2-column layout
- For Parents: bullet points on homework stress + child confidence
- For Students: bullet points on personalised learning + interactive sessions

**Subjects Section**
- Subtitle updated: now explicitly mentions Nigeria, UK, US, Canada, Australia
- Subject range updated: "from P1 to P6"

**How It Works Section** - Restyle
- Layout changed from centered 2×2 grid to horizontal: intro/CTA column (left) + 2×2 step cards (right)
- Step descriptions tightened (more concise)
- "Google Meet" added to session platform description
- `.how-step` cards now have white background + border

**New: "Ready to Start Learning?" CTA Banner** (between How It Works and FAQ)
- Tea green (`#C6DABF`) background
- Left: heading, subtitle, Book a Session CTA
- Right: book/pencil decorative icons

**FAQ Section** - replaces "Your Voice" feedback widget
- 8 FAQ accordion items (verbatim from client brief):
  1. How do you match tutors with students?
  2. How long are the tutoring sessions?
  3. Can tutoring help if my child is struggling or falling behind?
  4. Will my child get homework or practice between sessions?
  5. What makes your tutoring different from school?
  6. Do I need special equipment?
  7. Will sessions be recorded?
  8. How can I track my child's progress?
- Click-to-expand accordion with chevron rotation animation

**New: Contact Section** (`#contact`)
- Sea green background
- Email link: info@thinkviva.org
- WhatsApp link: +234 707 734 0116

**Footer**
- Brand description updated: "Fostering exceptional education and bridging learning gaps for under-served and all children. Connecting diaspora families to Nigerian tutors."
- Tagline added: "Smart Learning for Growing Minds" in celadon
- Platform column: Feedback link removed; About Us + Pricing added
- New Contact Us column: email + WhatsApp links
- Social icons added: LinkedIn 🔗, Threads @, Instagram 📷
- Email updated: `hello@thinkviva.org` → `info@thinkviva.org`
- "Pilot Phase" badge removed; replaced with "Terms & Conditions" link → `/terms`

---

### `public/css/style.css`

- Added `--warm-white: #FAF7F2` CSS variable
- `body` background changed from `var(--white)` to `#FAF7F2`
- `.hero` background changed to `#FAF7F2`
- `.nav-tagline` class added (small brand tagline under logo text)
- `.nav-links` gap reduced 24px → 18px (6 links fit on one line)
- `.hero-flags-label` color fixed: `rgba(255,255,255,0.55)` → `var(--muted)` (was invisible on light bg)
- `.hero-trust` and `.hero-trust-item` - new inline trust row styles
- `.hero-card` styles replaced with `.hero-visual`, `.hero-stats`, `.hero-stat`, `.grade-picker`, `.grade-footnote`
- `.benefits-section`, `.benefits-grid`, `.benefits-card`, `.benefits-list` - new dark teal benefits section
- `.subject-card` padding reduced: `28px 20px` → `18px 16px`
- `.how-layout` added: `1fr 2fr` grid for horizontal How It Works layout
- `.how-grid` margin-top removed (managed by layout)
- `.how-step` desktop style: added white background + border (was text-only on desktop)
- `.ready-section`, `.ready-inner`, `.ready-text`, `.ready-visual` - new CTA banner section (tea green)
- `.faq-section`, `.faq-list`, `.faq-item`, `.faq-q`, `.faq-chevron`, `.faq-a` - new accordion FAQ styles
- `.contact-section`, `.contact-inner`, `.contact-text`, `.contact-links`, `.contact-link` - new sea-green contact section
- `.footer-tagline-text`, `.footer-socials`, `.footer-social-btn`, `.footer-contact-link`, `.footer-terms-link` - new footer element styles
- Responsive: `.hero-card { display:none }` → `.hero-visual { display:none }` at 768px
- Responsive: `.benefits-grid` 1-col at 768px
- Responsive: `.how-layout` stacks at 768px
- Responsive: `.ready-inner` stacks at 768px; `.ready-visual` hidden
- Responsive: `.contact-inner` stacks at 768px
- Responsive: `.how-grid` 1-col at 480px; `.nav-tagline` hidden at 480px

---

### `public/js/main.js`

- `gradeDescriptions.P5` updated: removed "Common Entrance / BECE" reference → "targeted exam preparation across all curricula"
- `gradeDescriptions.P6` added: Primary 6 (age 10–11) description
- `toggleFaq()` function added for FAQ accordion

---

### `public/apply.html`

- Primary 6 checkbox added to "Grades You're Comfortable Teaching" section

---

### Previous Changes (earlier sessions - for reference)

| Date | Change |
|---|---|
| 2026 | Rebrand EduBridge Africa → ThinkViva |
| 2026 | Domain configured: thinkviva.org |
| 2026 | New Coolors palette: Dark Teal / Sea Green / Celadon / Tea Green / Vanilla Cream |
| 2026 | StudyPath-style layout: white nav, light hero, dark teal trust row, 4-col subjects |
| 2026 | Mobile enhancements: sticky CTA bar, bottom-sheet modal, touch feedback |
| 2026 | Applied to Teach page created with 4-step form + IT readiness test |
| 2026 | Admin dashboard created |
| 2026 | MongoDB/Mongoose integration with serverless-safe connection caching |
| 2026 | Local Languages → "Coming Soon" |
| 2026 | Math icon fixed (✂️ → 🔢), English icon fixed (📚 → 📖) |
| 2026 | Subjects subtitle broadened beyond NERDC curriculum |
| 2026 | Australia flag removed from hero (timezone concerns) |
| 2026 | Tutor earnings section removed (awaiting verified figures) |
| 2026 | Homework Support step added to How It Works |
