export enum AspectRatio {
  PORTRAIT_9_16 = "9:16",
  LANDSCAPE_16_9 = "16:9",
  PORTRAIT_3_4 = "3:4",
  SQUARE_1_1 = "1:1"
}

export interface VideoConfig {
  width: number;
  height: number;
}

export const ASPECT_RATIO_CONFIGS: Record<AspectRatio, VideoConfig> = {
  [AspectRatio.PORTRAIT_9_16]: { width: 405, height: 720 },
  [AspectRatio.LANDSCAPE_16_9]: { width: 720, height: 405 },
  [AspectRatio.PORTRAIT_3_4]: { width: 540, height: 720 },
  [AspectRatio.SQUARE_1_1]: { width: 600, height: 600 },
};
