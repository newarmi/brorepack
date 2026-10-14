export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
}
