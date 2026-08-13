// Shared option lists for the buyer's home specification inputs, collected
// on the Lot Check form and carried through to the report's concept panel.

export const STORY_OPTIONS = ["1", "1.5", "2", "3+"] as const;

export const GARAGE_OPTIONS = [
  { value: "none", label: "No garage" },
  { value: "1", label: "1-car" },
  { value: "2", label: "2-car" },
  { value: "3", label: "3-car" },
] as const;

export const STYLE_OPTIONS = [
  "Craftsman",
  "Modern",
  "Colonial",
  "Ranch",
  "Farmhouse",
  "Contemporary",
] as const;

export interface HomeSpec {
  bedrooms: number;
  bathrooms: number;
  stories: string;
  garage: string;
  style: string;
  notes: string;
}

export const DEFAULT_HOME_SPEC: HomeSpec = {
  bedrooms: 3,
  bathrooms: 2,
  stories: "2",
  garage: "2",
  style: "Farmhouse",
  notes: "",
};
