# SpaceXAI Kenya branding

`lib/brand.ts` defines the current community identity and active asset references. The original community wordmark uses the existing Inter typography, warm dark background, muted Kenya label, and orange punctuation. This is a community identity, not an official SpaceX/xAI logo.

- Navigation: `components/brand-wordmark.tsx`.
- Icon: `app/icon.png`; editable source: `public/brand/community-icon.svg`.
- Social previews: `app/opengraph-image.jpg` and `app/twitter-image.jpg` (1200 × 630); editable source: `public/brand/social-preview.svg`.
- Active card: `public/frame-card-assets/spacexai-kenya-card-template.png` (1024 × 1024). The original template remains available for historical use.

The card branding was edited with the built-in image generation tool. Only the top wordmark, bottom wordmark, and first hashtag region were composited into the original template; artwork and photo placement outside these regions are pixel-identical to the original. Regions in original-image pixels: `(300, 35, 424, 50)`, `(260, 945, 504, 52)`, and `(260, 859, 174, 37)` (x, y, width, height).

Generation prompt:

> Edit the shown 1024x1024 meetup-card template. Preserve ALL artwork, dimensions, black background, photo frame coordinates x272 y224 width480 height574, avatar, social icons, and layout exactly. ONLY replace top CURSOR logo and cube with plain typographic 'SpaceXAI Kenya' centered within x300..724 y43..82, white semibold modern sans serif (Kenya muted gray). Replace bottom CURSOR wordmark with 'SpaceXAI Kenya', centered within x260..764 y950..988. No official SpaceX or xAI symbols. Replace hashtag #CursorAINairobi with #SpaceXAIKenya; preserve other hashtags and text. Do not redesign anything, do not move or rescale photo area or city artwork. Output square 1024x1024 PNG asset for production.

Historical database content, product references, domains, storage prefixes, and integration identifiers intentionally retain their existing names. Child page metadata inherits the brand suffix from the root layout and must not append it manually.
