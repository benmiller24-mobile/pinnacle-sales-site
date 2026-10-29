// Single source of truth for WHERE Pinnacle sells WHAT.
// Footer, Organization schema, form dropdowns, About, the homepage and the territory guide
// all read from here. Change the footprint here — never type a state count or state list
// into page copy (scripts/check-copy.mjs fails the build if you do).

export interface State {
  code: string;
  name: string;
  slug: string; // /territory/<slug>/
}

/** WW Wood Products territory (Shiloh, Eclipse, Aspect, Vistora; US Stone rides with it). */
export const WW_STATES: State[] = [
  { code: 'AZ', name: 'Arizona', slug: 'arizona' },
  { code: 'CA', name: 'California', slug: 'california' },
  { code: 'CO', name: 'Colorado', slug: 'colorado' },
  { code: 'ID', name: 'Idaho', slug: 'idaho' },
  { code: 'MT', name: 'Montana', slug: 'montana' },
  { code: 'NV', name: 'Nevada', slug: 'nevada' },
  { code: 'NM', name: 'New Mexico', slug: 'new-mexico' },
  { code: 'OR', name: 'Oregon', slug: 'oregon' },
  { code: 'WA', name: 'Washington', slug: 'washington' },
];

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numberWord = (n: number) => WORDS[n] ?? String(n);
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const WW_STATE_COUNT = WW_STATES.length;
export const WW_STATE_COUNT_WORD = numberWord(WW_STATE_COUNT); // "nine"

/** "Arizona, California, …, and Washington" */
export const joinList = (items: string[]) =>
  items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
export const WW_STATE_NAMES = joinList(WW_STATES.map((s) => s.name));
export const WW_STATE_CODES = joinList(WW_STATES.map((s) => s.code));
export const WW_STATE_NAME_ARRAY = WW_STATES.map((s) => s.name);

export interface Brand {
  name: string;
  short: string;
  path: string;
  /** 'ww' = sold in WW_STATES only; 'national' = available nationwide (Pronorm via EKD). */
  coverage: 'ww' | 'national';
  /** Value used in form dropdowns / checkboxes (the lead function maps these). */
  formValue: string;
}

/** Brands marketed on this site. Add a line here (and its page) when a new line goes public. */
export const BRANDS: Brand[] = [
  { name: 'Shiloh Cabinetry', short: 'Shiloh', path: '/brands/shiloh-cabinetry/', coverage: 'ww', formValue: 'Shiloh Cabinetry' },
  { name: 'Eclipse Cabinetry', short: 'Eclipse', path: '/brands/eclipse-cabinetry/', coverage: 'ww', formValue: 'Eclipse Cabinetry' },
  { name: 'Aspect Cabinetry', short: 'Aspect', path: '/brands/aspect-cabinetry/', coverage: 'ww', formValue: 'Aspect Cabinetry' },
  { name: 'Pronorm German Kitchens', short: 'Pronorm', path: '/brands/pronorm-german-kitchens/', coverage: 'national', formValue: 'Pronorm German Kitchens' },
  { name: 'Vistora Closets', short: 'Vistora', path: '/brands/vistora-closets/', coverage: 'ww', formValue: 'Vistora Closets' },
  { name: 'US Stone Group', short: 'US Stone', path: '/brands/us-stone-group/', coverage: 'ww', formValue: 'US Stone Group' },
];

export const BRAND_COUNT = BRANDS.length;
export const BRAND_COUNT_WORD = numberWord(BRAND_COUNT);
export const BRAND_SHORT_NAMES = joinList(BRANDS.map((b) => b.short));
export const WW_BRAND_SHORT_NAMES = joinList(BRANDS.filter((b) => b.coverage === 'ww' && b.short !== 'US Stone').map((b) => b.short));

/** Form dropdown: WW states, then the nationwide Pronorm option. */
export const FORM_STATE_OPTIONS: [string, string][] = [
  ...WW_STATES.map((s): [string, string] => [s.code, s.name]),
  ['Other', 'Other state (Pronorm nationwide)'],
];

/** One-line footprint statement used in the footer and anywhere a summary is needed. */
export const FOOTPRINT_LINE = `WW Wood Products territory: ${WW_STATE_CODES} • Pronorm available nationwide`;
