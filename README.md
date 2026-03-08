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
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

### Google Analytics 4

1. Create a GA4 property and a Web data stream.
2. Copy the Measurement ID that looks like `G-XXXXXXXXXX`.
3. Put it in `NEXT_PUBLIC_GA_ID`.
4. Deploy and open the site.
5. Verify in GA4 Realtime or DebugView.

### Microsoft Clarity

1. Create a Clarity project for `orwiss.xyz`.
2. Copy the Clarity project ID.
3. Put it in `NEXT_PUBLIC_CLARITY_ID`.
4. Deploy and visit the site once.
5. Verify in the Clarity dashboard.

## Tracked Events

### Sent to GA4 and Clarity

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
2. Confirm `project_card_click` and `project_detail_view` appear in GA4 Realtime.
3. Confirm the session appears in Clarity.
4. Confirm CV and external link clicks are tracked.
