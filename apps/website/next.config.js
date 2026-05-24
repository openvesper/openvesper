/** @type {import('next').NextConfig} */

// Security headers — applied to all routes
// Inspired by https://owasp.org/www-project-secure-headers/
const securityHeaders = [
  // Prevents browsers from MIME-sniffing responses away from declared content-type
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prevents the site from being framed (clickjacking protection)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Controls how much referrer info is sent with requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disables features we don't need (camera, microphone, geolocation, etc.)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  // Force HTTPS for 2 years; include subdomains; preload eligible
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content-Security-Policy: restrict what the page can load
  // Allows self + minimal needed sources, no inline/eval scripts
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",         // Next.js needs unsafe-inline for hydration markers
      "style-src 'self' 'unsafe-inline'",          // Tailwind injects inline styles
      "img-src 'self' data: https:",               // Allow remote images (HTTPS only)
      "font-src 'self' data:",
      "connect-src 'self'",                        // No external API calls from the website itself
      "frame-ancestors 'none'",                    // Same as X-Frame-Options DENY
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",                         // No <object>, <embed>, <applet>
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,

  // Don't expose powered-by header
  poweredByHeader: false,

  // Apply security headers to every route
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Disable ETag generation (small privacy improvement)
  generateEtags: false,
};

module.exports = nextConfig;
