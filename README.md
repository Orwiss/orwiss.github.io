# Orwiss Portfolio

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Analytics Setup

This project supports both Google Analytics 4 and Microsoft Clarity.

### Environment Variables

Copy [.env.example](C:/Users/orwis/OneDrive/Documents/Playground/_tmp_site_repo/.env.example) to `.env.local` and fill in:

```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

`NEXT_PUBLIC_GTM_ID` is optional here because the site already falls back to the current production container `GTM-MPMTP5SW`.

### Google Tag Manager + GA4

1. The site loads GTM container `GTM-MPMTP5SW`.
2. In GTM, create a `Google tag`.
3. Use the GA4 Measurement ID `G-16HN6ZXNBG`.
4. Set the trigger to `All Pages`.
5. Publish the container.
6. Check GA4 Realtime to confirm page views.

Custom interaction events are pushed into `dataLayer` with these event names:

- `project_card_click`
- `project_detail_view`
- `cv_click`
- `outbound_link_click`
- `about_scroll_depth`
- `section_nav_click`

If you want those custom events to appear in GA4, create a GTM `GA4 Event` tag for each event name and trigger it from the matching Custom Event.

### Microsoft Clarity

1. Create a Clarity project for `orwiss.xyz`.
2. Copy the Clarity project ID.
3. Put it in `NEXT_PUBLIC_CLARITY_ID`.
4. Deploy and visit the site once.
5. Verify in the Clarity dashboard.

## Tracked Events

### Pushed to GTM dataLayer and sent to Clarity

- `project_card_click`
- `project_detail_view`
- `cv_click`
- `outbound_link_click`
- `about_scroll_depth`
- `section_nav_click`

### Sent to Clarity only

- `section:view`

## What Each Tool Is For

### GA4

Use GA4 for counts and trends:

- which pages are most visited
- which projects are clicked most
- which external links get the most clicks
- what traffic sources bring visitors
- mobile vs desktop differences

### Clarity

Use Clarity for behavior and UX debugging:

- session replay
- click heatmaps
- scroll behavior
- dead clicks or rage clicks
- mobile interaction problems

## Recommended Checks After Deployment

1. Open the site and click a few project cards.
2. In GTM Preview, confirm `project_card_click` and `project_detail_view` hit the data layer.
3. Confirm the session appears in Clarity.
4. After GTM event tags are published, confirm the same events appear in GA4 Realtime.
