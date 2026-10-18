export const PRODUCT_CATEGORIES = [
  { value: "MOUSE", label: "Mouse" },
  { value: "KEYBOARD", label: "Teclados" },
  { value: "HEADPHONES", label: "Audífonos" },
  { value: "MONITOR", label: "Monitores" },
  { value: "OTHER", label: "Otros" },
];

export const PRODUCT_CATEGORY_LABELS = Object.fromEntries(
  PRODUCT_CATEGORIES.map(({ value, label }) => [value, label]),
);
