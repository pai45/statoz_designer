# Video placements

These are production presets, not claims that a platform accepts only one format.
Explicit width and height override a preset. Supply both as positive even integers.
The renderer exports square pixels without stretching or adding black bars.

| Preset | Aliases | Dimensions |
| --- | --- | --- |
| `reel` | `instagram`, `instagram-reel`, `reels`, `short`, `shorts`, `youtube-short`, `youtube-shorts`, `mobile`, `portrait-mobile` | 1080 x 1920 |
| `portrait-feed` | `instagram-feed`, `linkedin`, `linkedin-feed`, `linkedin-portrait` | 1080 x 1350 |
| `square` | `square-social`, `instagram-square`, `linkedin-square` | 1080 x 1080 |
| `landscape` | `youtube`, `youtube-landscape`, `linkedin-landscape` | 1920 x 1080 |

If placement is absent, ask for the target or dimensions. Generic Instagram means
Reel, generic LinkedIn means portrait feed, and generic YouTube means landscape.
Mention these assumptions briefly when interpreting a request. Mobile here means
a portrait social video; for an embedded app panel, inspect its actual dimensions.

## Composition and safe areas

Use a separate composition for each aspect ratio, not a center crop of the same
render. Keep faces, UI details, copy and the logo clear of platform controls.
Default internal composition margins are 8% on each edge. For 9:16 social use,
reserve 14% at the top, 22% at the bottom and 14% at the right. These are conservative
house guides, not official universal pixel-safe boundaries. Check the target's
current overlay/template for ads or exact safe-zone requirements.

Scale text to the viewing size: roughly 40-64px supporting copy on a 1080px-wide
portrait video is a useful starting point. Check the composition at phone size.
LinkedIn copy should lead with product value; short-form entertainment can use
faster reveals. Keep the final CTA visible, and do not promise unsupported features.

## Source guidance

Presets checked September 10, 2026. Recheck the appropriate official source before
promising upload eligibility, duration/file-size limits, ad compliance, or exact
safe areas; do not bake changing service limits into the renderer.

- [Meta Reels creative guidance](https://www.facebook.com/business/ads/facebook-instagram-reels-ads): vertical 9:16 with key messages inside safe areas.
- [YouTube resolutions and ratios](https://support.google.com/youtube/answer/6375112): standard landscape 16:9 with 1920 x 1080 for 1080p.
- [YouTube Shorts](https://support.google.com/youtube/answer/15424877): distinguish Shorts from landscape uploads.
- [LinkedIn ad specifications](https://www.linkedin.com/help/linkedin/answer/a424737): portrait 4:5, square, vertical 9:16 and landscape options; ads have placement-specific requirements.
- [LinkedIn organic video](https://www.linkedin.com/help/linkedin/answer/a7486279): keep key elements away from the interface at the edges.
