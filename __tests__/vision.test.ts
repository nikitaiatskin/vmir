const mockNative = {
  aiAvailability: jest.fn(),
  cutout: jest.fn(),
  samplePixels: jest.fn(),
  classify: jest.fn(),
  recognizeText: jest.fn(),
  tagItem: jest.fn(),
  readScreenshot: jest.fn(),
};
jest.mock('hanger-vision', () => ({
  get HangerVision() {
    return mockNative;
  },
}));

import { readShopScreenshot, removeBackground, suggestItem, withTimeout } from '@/features/vision';

beforeEach(() => jest.resetAllMocks());

describe('suggestItem', () => {
  it('returns null without Apple Intelligence (US-1.9)', async () => {
    mockNative.aiAvailability.mockResolvedValue('notSupported');
    await expect(suggestItem('file://x.png', [])).resolves.toBeNull();
    expect(mockNative.tagItem).not.toHaveBeenCalled();
  });

  it('returns a validated suggestion', async () => {
    mockNative.aiAvailability.mockResolvedValue('available');
    mockNative.classify.mockResolvedValue(['shirt', 'clothing']);
    mockNative.tagItem.mockResolvedValue({
      category: 'top',
      name: 'White linen shirt',
      seasons: ['summer', 'summer', 'spring'],
      material: 'linen',
    });
    await expect(suggestItem('file://x.png', ['#F7F7F5'])).resolves.toEqual({
      category: 'top',
      name: 'White linen shirt',
      seasons: ['summer', 'spring'],
    });
    expect(mockNative.tagItem).toHaveBeenCalledWith(['shirt', 'clothing'], ['white']);
  });

  it('returns null when the model answers with an unknown category', async () => {
    mockNative.aiAvailability.mockResolvedValue('available');
    mockNative.classify.mockResolvedValue([]);
    mockNative.tagItem.mockResolvedValue({ category: 'hat', name: 'x', seasons: [], material: '' });
    await expect(suggestItem('file://x.png', [])).resolves.toBeNull();
  });

  it('returns null when the model throws', async () => {
    mockNative.aiAvailability.mockResolvedValue('available');
    mockNative.classify.mockResolvedValue([]);
    mockNative.tagItem.mockRejectedValue(new Error('AI_UNAVAILABLE'));
    await expect(suggestItem('file://x.png', [])).resolves.toBeNull();
  });
});

describe('removeBackground', () => {
  it('returns null when Vision finds no subject', async () => {
    mockNative.cutout.mockRejectedValue(new Error('No subject'));
    await expect(removeBackground('file://x.jpg')).resolves.toBeNull();
  });
});

describe('readShopScreenshot', () => {
  it('falls back to OCR price without AI', async () => {
    mockNative.recognizeText.mockResolvedValue(['COS', 'Wool coat', '€149.00']);
    mockNative.aiAvailability.mockResolvedValue('turnedOff');
    await expect(readShopScreenshot('file://s.png')).resolves.toEqual({
      brand: null,
      name: null,
      priceCents: 14900,
      currency: 'EUR',
      category: null,
    });
  });

  it('uses AI output when available', async () => {
    mockNative.recognizeText.mockResolvedValue(['COS', 'Wool coat', '€149.00']);
    mockNative.aiAvailability.mockResolvedValue('available');
    mockNative.readScreenshot.mockResolvedValue({
      brand: 'COS',
      name: 'Wool coat',
      price: '149.00',
      currency: 'EUR',
      category: 'outerwear',
    });
    await expect(readShopScreenshot('file://s.png')).resolves.toEqual({
      brand: 'COS',
      name: 'Wool coat',
      priceCents: 14900,
      currency: 'EUR',
      category: 'outerwear',
    });
  });
});

describe('withTimeout', () => {
  it('rejects slow promises', async () => {
    jest.useFakeTimers();
    const p = withTimeout(new Promise(() => {}), 10_000);
    jest.advanceTimersByTime(10_001);
    await expect(p).rejects.toThrow('timeout');
    jest.useRealTimers();
  });
});
