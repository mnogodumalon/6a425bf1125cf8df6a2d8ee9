// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Restaurants {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    beschreibung?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    stadt?: string;
    standort?: GeoLocation; // { lat, long, info }
    telefon?: string;
    website?: string;
    oeffnungszeiten_mo?: string;
    oeffnungszeiten_di?: string;
    oeffnungszeiten_mi?: string;
    oeffnungszeiten_do?: string;
    oeffnungszeiten_fr?: string;
    oeffnungszeiten_sa?: string;
    oeffnungszeiten_so?: string;
    kuechenstil?: LookupValue;
    ernaehrungsfilter?: LookupValue[];
    foto?: string;
  };
}

export const APP_IDS = {
  RESTAURANTS: '6a425bdddfb17b839e346e0f',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'restaurants': {
    kuechenstil: [{ key: "italienisch", label: "Italienisch" }, { key: "asiatisch", label: "Asiatisch" }, { key: "deutsch", label: "Deutsch" }, { key: "griechisch", label: "Griechisch" }, { key: "indisch", label: "Indisch" }, { key: "japanisch", label: "Japanisch" }, { key: "mexikanisch", label: "Mexikanisch" }, { key: "amerikanisch", label: "Amerikanisch" }, { key: "franzoesisch", label: "Französisch" }, { key: "tuerkisch", label: "Türkisch" }, { key: "mediterran", label: "Mediterran" }, { key: "vietnamesisch", label: "Vietnamesisch" }, { key: "thailaendisch", label: "Thailändisch" }, { key: "spanisch", label: "Spanisch" }, { key: "sonstige", label: "Sonstige" }],
    ernaehrungsfilter: [{ key: "vegan", label: "Vegan" }, { key: "vegetarisch", label: "Vegetarisch" }, { key: "glutenfrei", label: "Glutenfrei" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'restaurants': {
    'name': 'string/text',
    'beschreibung': 'string/textarea',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'stadt': 'string/text',
    'standort': 'geo',
    'telefon': 'string/tel',
    'website': 'string/url',
    'oeffnungszeiten_mo': 'string/text',
    'oeffnungszeiten_di': 'string/text',
    'oeffnungszeiten_mi': 'string/text',
    'oeffnungszeiten_do': 'string/text',
    'oeffnungszeiten_fr': 'string/text',
    'oeffnungszeiten_sa': 'string/text',
    'oeffnungszeiten_so': 'string/text',
    'kuechenstil': 'lookup/select',
    'ernaehrungsfilter': 'multiplelookup/checkbox',
    'foto': 'file',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateRestaurants = StripLookup<Restaurants['fields']>;