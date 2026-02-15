# Pinnacle Sales — Astro + Netlify Website

## Quick Start
```bash
npm install
npm run dev      # Local dev server at localhost:4321
npm run build    # Production build → /dist
npm run preview  # Preview production build
```

## Deploy to Netlify
1. Push this repo to GitHub
2. Connect the repo in Netlify (New site → Import existing project)
3. Netlify auto-detects settings from `netlify.toml`
4. Set custom domain to `www.pinnaclesales.biz`
5. Enable Netlify Forms in dashboard (auto-detected from HTML `data-netlify="true"`)

## Site Structure — 43 Pages

### Primary Pages (9)
| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, brand cards, value props, Playbook teaser, LinkedIn |
| `/about` | Company mission, team bios, manufacturer partners, NKBA certification |
| `/become-a-dealer` | Partnership benefits + Netlify-powered application form |
| `/contact` | Phone, email, LinkedIn + Netlify-powered contact form |
| `/faqs` | 14 FAQs with FAQPage schema markup |
| `/dealer-success-stories` | Featured project cards linking to Playbook case studies |
| `/privacy` | Full privacy policy (data collection, cookies, rights, CCPA) |
| `/sitemap` | HTML sitemap linking every page |
| `/404` | Custom 404 with navigation links |

### Brand Pages (5)
| Route | Brand |
|-------|-------|
| `/brands/shiloh-cabinetry` | Face-frame, inset, custom paint, 6 inset styles |
| `/brands/eclipse-cabinetry` | Frameless full-access construction |
| `/brands/aspect-cabinetry` | Value semi-custom for builders |
| `/brands/pronorm-german-kitchens` | German engineering, Y-Line, Boho, Modern Shaker LF |
| `/brands/vistora-closets` | Made-to-order closet solutions |

### Territory Pages (10)
Each with state-specific design trends, market details, and local context:
AZ, CA, CO, ID, MT, NV, NM, OR, UT, WA

### Playbook Blog Posts (18 + index)
Full article content migrated from Squarespace for all 18 posts.

## SEO Infrastructure
- JSON-LD schema on every page: Organization, LocalBusiness, Article, FAQPage, Product, BreadcrumbList
- Open Graph + Twitter Card meta tags
- Canonical URLs
- Auto-generated XML sitemap (`@astrojs/sitemap`)
- HTML sitemap at `/sitemap`
- `robots.txt` with sitemap reference

## Netlify Configuration
- 25+ 301 redirects from all old Squarespace URLs
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Cache headers: 1-year immutable for static assets
- Two Netlify Forms: `dealer-application` and `contact`

## Forms
Both forms use [Netlify Forms](https://docs.netlify.com/forms/setup/) with:
- Honeypot spam protection (`netlify-honeypot="bot-field"`)
- Hidden `form-name` field for Netlify detection
- No JavaScript required — works with static HTML

After deploying, verify forms appear in Netlify dashboard under Forms.

## Pre-Launch Checklist
1. **Images**: Blog posts reference Squarespace CDN URLs. Download images, convert to WebP, place in `/public/images/`, update `<img>` src paths
2. **Google Search Console**: Submit `sitemap-index.xml`, request indexing
3. **Bing Webmaster Tools**: Submit sitemap
4. **Google Rich Results Test**: Verify schema on homepage, FAQs, brand pages, blog posts
5. **Lighthouse audits**: Target 95+ on Performance, SEO, Accessibility
6. **GA4**: Add tracking snippet to `SEOHead.astro`
7. **Google Business Profile**: Update website URL
8. **LinkedIn / NKBA**: Update all external profile URLs
9. **DNS**: Point `www.pinnaclesales.biz` to Netlify
10. **SSL**: Netlify provisions automatically after DNS propagation
