export type AIAvailability = 'available' | 'notSupported' | 'turnedOff' | 'notReady';

export type NativeItemSuggestion = {
  category: string;
  name: string;
  seasons: string[];
  material: string;
};

export type NativeWishSuggestion = {
  brand: string;
  name: string;
  price: string;
  currency: string;
  category: string;
};

export interface HangerVisionNative {
  aiAvailability(): Promise<AIAvailability>;
  cutout(uri: string): Promise<string>;
  samplePixels(uri: string, size: number): Promise<number[]>;
  classify(uri: string): Promise<string[]>;
  recognizeText(uri: string): Promise<string[]>;
  tagItem(labels: string[], colorNames: string[]): Promise<NativeItemSuggestion>;
  readScreenshot(lines: string[]): Promise<NativeWishSuggestion>;
}
