/**
 * The downloadable "CreatorHub360 Creator Template" (spec §4). Header order is fixed;
 * two example rows show the accepted formats. Served as text/csv by
 * /admin/creator-library/import/template.
 */

export const TEMPLATE_HEADERS = [
  "full_name",
  "email",
  "instagram_handle",
  "instagram_followers",
  "tiktok_handle",
  "tiktok_followers",
  "youtube_handle",
  "youtube_subscribers",
  "primary_category",
  "additional_categories",
  "country",
  "state",
  "city",
  "bio",
  "website",
  "profile_image_url",
] as const;

const EXAMPLE_ROWS: string[][] = [
  [
    "Jordan Rivera",
    "jordan@example.com",
    "@jordanrivera",
    "125000",
    "jordanrivera",
    "1.2M",
    "@jordanrivera",
    "",
    "Beauty",
    "Lifestyle, Fashion",
    "United States",
    "California",
    "Los Angeles",
    "Beauty and lifestyle creator focused on clean skincare.",
    "https://jordanrivera.com",
    "",
  ],
  [
    "Sam Chen",
    "",
    "samchen",
    "48,500",
    "",
    "",
    "",
    "",
    "Technology",
    "",
    "United States",
    "NY",
    "New York City",
    "",
    "",
    "",
  ],
];

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildTemplateCsv(): string {
  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...EXAMPLE_ROWS.map((row) => row.map(csvCell).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}
