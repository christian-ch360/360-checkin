import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera stays allowed for self — the QR scanner (dashboard check-in and
  // /kiosk) needs getUserMedia. Nothing else in the app touches mic/location.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Marketplace was folded into Community as the "Collabs" tab — old
  // bookmarks/links to the standalone page still resolve.
  async redirects() {
    return [
      { source: "/collab-hub", destination: "/community/collabs", permanent: true },
      { source: "/collab-hub/:postId", destination: "/community/collabs/:postId", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
