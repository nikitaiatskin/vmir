// Database types for supabase/migrations. Regenerate with `npm run db:types` after every migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Base = { id: string; user_id: string; created_at: string };
type BaseInsert = { id?: string; user_id?: string; created_at?: string };

type Table<Row extends Base, Required extends keyof Row = never> = {
  Row: Row;
  Insert: BaseInsert &
    Pick<Row, Required> &
    Partial<Omit<Row, keyof Base | Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ItemCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type ProcessingStatus = 'pending' | 'done' | 'failed';
export type ItemStatus = 'active' | 'archived';
export type WishDecision = 'bought' | 'skipped';

export type ItemRow = Base & {
  category: ItemCategory;
  name: string | null;
  brand: string | null;
  size: string | null;
  price_cents: number | null;
  currency: string;
  purchased_at: string | null;
  seasons: Season[];
  colors: string[];
  colors_edited: boolean;
  photo_path: string;
  cutout_path: string | null;
  processing_status: ProcessingStatus;
  status: ItemStatus;
  source_wish_id: string | null;
};

export type OutfitRow = Base & {
  name: string;
  tags: string[];
  preview_path: string | null;
};

export type OutfitItemRow = Base & {
  outfit_id: string;
  item_id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
};

export type WishRow = Base & {
  category: ItemCategory;
  name: string | null;
  brand: string | null;
  shop: string | null;
  url: string | null;
  price_cents: number | null;
  currency: string;
  photo_path: string | null;
  cutout_path: string | null;
  colors: string[];
  processing_status: ProcessingStatus;
  cooloff_days: 7 | 14 | 30;
  decide_at: string;
  decision: WishDecision | null;
  decided_at: string | null;
};

export type BrandSizeRow = Base & {
  brand: string;
  category: ItemCategory | null;
  size: string;
};

export type WearRow = Base & {
  item_id: string;
  worn_on: string;
  outfit_id: string | null;
};

export type Database = {
  public: {
    Tables: {
      items: Table<ItemRow, 'category' | 'photo_path'>;
      outfits: Table<OutfitRow, 'name'>;
      outfit_items: Table<OutfitItemRow, 'outfit_id' | 'item_id' | 'x' | 'y'>;
      wishes: Table<WishRow, 'category'>; // decide_at is set by a trigger
      brand_sizes: Table<BrandSizeRow, 'brand' | 'size'>;
      wears: Table<WearRow, 'item_id'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_my_data: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      item_category: ItemCategory;
      season: Season;
      processing_status: ProcessingStatus;
      item_status: ItemStatus;
      wish_decision: WishDecision;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
