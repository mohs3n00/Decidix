# Decidix design system

The look of the app, taken from two reference screens (a health dashboard and
a compensation dashboard) and **painted in Decidix's own colours**. The
structure of the screens (what is on each one) is the Figma file's; this
document is how it looks. The code is the source of truth: tokens are in
`lib/core/constants/`, shared widgets in `lib/shared/widgets/`.

## What we took from the references

| Idea in the references | How it appears in Decidix |
|---|---|
| Very soft, almost white canvas with a faint colour glow in the top corner | `mist` canvas plus a cyan and blue glow behind the header (`BrandBackdrop`) |
| Big rounded cards, almost no outline, a light shadow | Cards are 28 px round, a 1 px `hairline`, `AppShadows.card` |
| Headlines in two tones: the key word dark, the rest faded | `PageTitle`: first word `navy`, the rest `fadedInk` |
| Small muted caption above a headline, in normal case | The eyebrow: 13 px `ink`, no upper case |
| Dark pill buttons | `DecidixButton`: `navy`, fully round, 52 px high |
| Filled dark pill for the selected chip, light pill for the others | `DecidixChip` |
| Stripes (hatching) for the part that is empty, not reached, or still to come | `HatchedBar` and `HatchFill`: progress bars, bar charts, coverage |
| Floating capsule tab bar with a white circle on the active item | `DecidixBottomNavigation` |
| Big ring gauge with a large number inside | `DevelopmentIndexCard` |
| Light hero areas with colour fading in, dark text on them | `HeroCard` (dashboard, region profile, simulator) |

Not taken: the green. The accent is the brand blue to cyan, the dark colour is
the brand navy, and Outfit (Latin) with Cairo (Arabic) stay as the fonts.

## Colour

| Token | Value | Used for |
|---|---|---|
| `navy` | `#061A3A` | Text, dark buttons, selected chips, the AI panel |
| `blue` | `#2563EB` | Accent, links, the start of the gradient |
| `cyan` | `#21EAF4` | The end of the gradient, glows, labels on navy |
| `mist` | `#F5F7FA` | Page canvas |
| `ink` | `#5B6B85` | Secondary text |
| `fadedInk` | `#7D8AA0` | The faded part of a headline (large text only) |
| `hairline` | `#E9EEF5` | Card outlines |
| `wellTint` | `#F1F5FA` | Inner wells (stat tiles, table blocks) |
| `successText` / `dangerText` | `#0A8F5C` / `#C9353A` | Green and red **text** (4.5:1 on white). The brighter `success` and `danger` are for fills, icons and bars |
| `warningText` | `#A56A00` | Amber text |

Rule: small text is always `navy`, `ink` or one of the `*Text` colours.
Never white text on the cyan end of a gradient (it does not reach 4.5:1).

## Shape

| | |
|---|---|
| Hero | 32 |
| Card | 28 |
| List row | 24 |
| Inner well, input | 18 |
| Pill (chip, button, badge) | fully round |

Gutter 20, gap between sections 20, card padding 20.

## Type

Same 23 styles as before (`AppTypography`). Page title 34/36 light, section
title 17 semibold, numbers medium with tight letter spacing. Arabic drops the
negative letter spacing.

## Components

- **Card**: white, 28 round, hairline, light shadow. Tap targets are real buttons for screen readers.
- **Chip**: 36 px. Selected: navy with white text. Other: white with a hairline.
- **Button**: navy pill, white label. `outlined` is white with a hairline.
- **Hatched bar**: the filled part is the brand gradient with round ends; what is left is diagonal stripes. 10 px high.
- **Tab bar**: a capsule, tinted, with the active tab in a white circle with a shadow; every tab keeps its label.
- **Hero**: pale gradient (white into a brand tint), a soft glow in one corner, dark text.
- **AI panel**: stays navy: the one dark block, so it reads as "the AI speaks".

## Checking it

`RENDER_OUT=<folder> flutter test test/tool/render_screens_test.dart` draws all
18 screens with the real fonts into PNGs (`RENDER_LANG=ar` for Arabic).
