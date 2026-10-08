# Clockwork Flight asset pack

31 individual PNG game assets with alpha transparency, except for the opaque sky. All art follows a Victorian steampunk palette and an upper-left warm light direction.

## Dimensions

| Assets | Size |
| --- | --- |
| `bird_idle`, `bird_flap_up`, `bird_flap_mid`, `bird_flap_down`, `bird_hit` | 256 × 256 |
| `pipe_body` | 256 × 512 |
| `pipe_cap` | 320 × 192 |
| `pipe_connector` | 256 × 192 |
| `bg_sky`, `bg_city_far`, `bg_city_mid`, `bg_city_near` | 1080 × 1920 |
| `airship_01`, `airship_02` | 512 × 256 |
| `steam_01`–`steam_04` | 256 × 256 |
| `spark_01`–`spark_04` | 128 × 128 |
| `hud_score_frame` | 420 × 160 |
| `hud_best_frame` | 320 × 140 |
| All six button states | 256 × 256 |
| `logo` | 900 × 360 |

## Assembly

- Tile `pipe_body` vertically. Its top and bottom edge rows match.
- For the upper obstacle, repeat `pipe_body` above `pipe_cap`; use the cap as supplied so its opening faces down. For the lower obstacle, vertically flip `pipe_cap` so its opening faces up, then repeat `pipe_body` below it.
- `pipe_connector` is an optional coupling overlay.
- Bird wing loop: `bird_flap_up` → `bird_flap_mid` → `bird_flap_down` → `bird_flap_mid`. All five bird sprites share a 256 × 256 canvas and center anchor.
- Steam and spark sequences play from `_01` through `_04`.
- Stack the transparent city layers over `bg_sky` in far, mid, near order. Keep the sky opaque; the city layers have transparent backgrounds.
- HUD frames contain no runtime text or values. Render score and best-score text in the game UI.
