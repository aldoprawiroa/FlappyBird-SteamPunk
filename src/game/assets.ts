const assetUrls = import.meta.glob<string>("../../assets/clockwork-flight/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const ASSET_NAMES = [
  "airship_01",
  "airship_02",
  "bird_idle",
  "bird_flap_up",
  "bird_flap_mid",
  "bird_flap_down",
  "bird_hit",
  "bg_sky",
  "bg_city_far",
  "bg_city_mid",
  "bg_city_near",
  "button_pause",
  "button_pause_pressed",
  "button_play",
  "button_play_pressed",
  "button_restart",
  "button_restart_pressed",
  "hud_best_frame",
  "hud_score_frame",
  "steam_01",
  "steam_02",
  "steam_03",
  "steam_04",
  "spark_01",
  "spark_02",
  "spark_03",
  "spark_04",
  "pipe_connector",
  "pipe_body",
  "pipe_cap",
  "logo",
] as const;

export type AssetName = (typeof ASSET_NAMES)[number];
export type AssetPack = Record<AssetName, HTMLImageElement>;

const urlsByName = new Map<string, string>();

for (const [path, url] of Object.entries(assetUrls)) {
  const fileName = path.split("/").at(-1)?.replace(/\.png$/, "");
  if (fileName) urlsByName.set(fileName, url);
}

export const STEAM_FRAMES: readonly AssetName[] = [
  "steam_01",
  "steam_02",
  "steam_03",
  "steam_04",
];

export const SPARK_FRAMES: readonly AssetName[] = [
  "spark_01",
  "spark_02",
  "spark_03",
  "spark_04",
];

export async function loadAssets(
  onProgress: (loaded: number, total: number) => void,
): Promise<AssetPack> {
  const images = {} as AssetPack;
  let loaded = 0;

  await Promise.all(
    ASSET_NAMES.map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const url = urlsByName.get(name);
          if (!url) {
            reject(new Error("Missing asset file: " + name + ".png"));
            return;
          }

          const image = new Image();
          image.onload = () => {
            images[name] = image;
            loaded += 1;
            onProgress(loaded, ASSET_NAMES.length);
            resolve();
          };
          image.onerror = () => reject(new Error("Could not load asset: " + name + ".png"));
          image.src = url;
        }),
    ),
  );

  return images;
}
