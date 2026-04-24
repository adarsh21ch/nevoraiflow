

# Plan — Equalize Mobile Pricing Card Heights

This is a **real UI bug**, not intentional. On mobile each card currently sizes to its own content, so the Free card looks short and Enterprise looks tall — bottoms jump as you swipe. The card sizes themselves are fine; we just need every carousel slide to match the **tallest** slide so all four cards share one bottom line.

## What changes

**Two files only — UI only, no logic, no design changes:**

1. `src/components/landing/PricingSection.tsx` (homepage pricing carousel)
2. `src/pages/PricingFullPage.tsx` (full /pricing page mobile carousel)

## How

Embla carousel already supports equal-height slides — we just need to opt in.

**On the `Carousel` wrapper:** keep current opts, add nothing here.

**On `CarouselContent`:** add `items-stretch` so flex children stretch to the tallest sibling.

**On each `CarouselItem`:** add `h-auto` (overrides Embla default) and ensure the inner card gets `h-full` on mobile too — i.e. change `md:h-full` → `h-full` on the four card wrappers (`freeCard`, `basicCard`, `proCard`, `enterpriseCard` in `PricingFullPage.tsx`, and the equivalent `planNodes` + enterprise card in `PricingSection.tsx`).

**Inside cards:** the existing `flex flex-col` + `mt-auto` on the CTA button area already pushes the button to the bottom — once cards are equal height, the Free card's button will sit at the same bottom line as Basic/Pro/Enterprise, and the empty space below "No live broadcast" will become natural breathing room above the button (visually identical to how desktop already looks).

**Feature list scroll cap (already in place):** the `max-h-[260px] overflow-y-auto` on the features `<ul>` stays — it prevents the Enterprise card from making the whole carousel absurdly tall on small screens. The tallest card now drives the shared height, but it's bounded.

## Result

```text
Before (mobile swipe):           After:
┌─────────┐  ┌─────────┐         ┌─────────┐  ┌─────────┐
│ Free    │  │ Basic   │         │ Free    │  │ Basic   │
│         │  │         │         │         │  │         │
│ [Start] │  │         │         │         │  │         │
└─────────┘  │         │         │         │  │         │
   ↑ short   │ [Get B.]│         │ [Start] │  │ [Get B.]│
             └─────────┘         └─────────┘  └─────────┘
                                  ↑ all bottoms aligned
```

No card resizing, no design tweaks, no copy changes — just a shared bottom line across all four mobile slides on both pricing surfaces.

## Not changing

- Card padding, font sizes, button styles, badges, copy, prices — untouched.
- Desktop grid — already aligned, unaffected.
- Razorpay flow, plan logic, Nevorai member handling — untouched.
- Feature list internal scroll cap — kept as-is.

