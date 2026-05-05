// Dealer testimonials shown on the homepage and /become-a-dealer.
//
// To add a real testimonial:
// 1. Drop the dealer's headshot into /public/images/testimonials/<slug>.webp
//    (square crop recommended, ~480x480 minimum, optimized to WebP).
// 2. Add an entry below with quote, name, role, dealership, location,
//    and optional photo path. Set `published: true` to make it live.
// 3. Set `featured: true` to surface it first on the homepage.
//
// Anything with `published: false` (or missing) will not render.

export interface Testimonial {
  slug: string;
  quote: string;
  name: string;
  role?: string;        // e.g. "Owner", "Designer", "Showroom Manager"
  dealership: string;
  location?: string;    // e.g. "Denver, CO"
  photo?: string;       // path under /images/testimonials/, e.g. "/images/testimonials/foo.webp"
  brands?: ('Shiloh'|'Eclipse'|'Aspect'|'Pronorm'|'Vistora')[];
  published?: boolean;
  featured?: boolean;
}

export const testimonials: Testimonial[] = [
  // Add real testimonials here. Example shape (left commented so it doesn't render):
  // {
  //   slug: 'plum-kitchens-kaimee',
  //   quote: "Pinnacle Sales has been the difference between us being a Shiloh dealer and being a Shiloh dealer that closes.",
  //   name: 'Kaimee Martelli',
  //   role: 'Owner',
  //   dealership: 'Plum Kitchens',
  //   location: 'Denver, CO',
  //   photo: '/images/testimonials/kaimee-martelli.webp',
  //   brands: ['Shiloh'],
  //   published: true,
  //   featured: true,
  // },
];

export const publishedTestimonials = testimonials.filter(t => t.published);
