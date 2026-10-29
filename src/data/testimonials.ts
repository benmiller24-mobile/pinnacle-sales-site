// Dealer testimonials — the single source for the homepage, /become-a-dealer and
// /dealer-success-stories. Only real, approved quotes, word for word. `excerpt` must be a
// verbatim sentence from `quote` (cards on home / become-a-dealer show the excerpt; the
// success-stories page shows the full quote). `featured` entries appear on the cards.
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
  photo?: string;       // round headshot for cards, under /images/testimonials/
  excerpt?: string;     // verbatim sentence from quote, used on cards
  url?: string;         // dealer website
  image?: string;       // larger dealer image for /dealer-success-stories/
  brands?: ('Shiloh'|'Eclipse'|'Aspect'|'Pronorm'|'Vistora')[];
  published?: boolean;
  featured?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    slug: "castle-vision-design-jason-castillo",
    quote: "Ben Miller and the team at Pinnacle Sales has been instrumental to our business. From the very beginning, Ben has given us guidance in creating our showroom, kept us apprised of current trends, navigate the intricacies of how our supplier operates, and never shied away from helping us through the tough situations that come with home remodeling. Over the 20 years I've been a designer, I've worked with a lot of sales representatives but Ben & Pinnacle Sales has truly gone above and beyond the rest to give us the tools for continued success.",
    excerpt: "Over the 20 years I've been a designer, I've worked with a lot of sales representatives but Ben & Pinnacle Sales has truly gone above and beyond the rest to give us the tools for continued success.",
    name: "Jason Castillo",
    role: "Owner",
    dealership: "Castle Vision Design",
    location: "Ventura, CA",
    url: "http://www.castlevisiondesign.com/",
    image: "/images/brands/dealer-castle-vision.webp",
    published: true,
    featured: true,
  },
  {
    slug: "kitchen-barn-andrew-naval",
    quote: "You have been so helpful this past year, from helping with the 2020 design program, to clarifying our questions about cabinets and processes, and even assisting us in the ordering process and the best ways customer service. Whenever we couldn't find an answer to our questions, and even customer service was at a loss, you were always able to step up and guide us in the right direction. Thank you so much from all of us at Kitchen Barn!",
    excerpt: "Whenever we couldn't find an answer to our questions, and even customer service was at a loss, you were always able to step up and guide us in the right direction.",
    name: "Andrew Naval",
    role: "Sales",
    dealership: "Kitchen Barn",
    location: "Poway, CA",
    url: "http://www.kitchenbarn.net/",
    image: "/images/brands/dealer-kitchen-barn.webp",
    published: true,
    featured: true,
  },
  {
    slug: "all-about-cabinets-and-countertops-wendy-sprague",
    quote: "Pinnacle Sales has been an exceptional partner to our team and to WW. Their support goes far beyond basic sales representation — they are responsive, proactive, and consistently invested in helping both our staff and our clients succeed. Behind the scenes, their communication, follow-through, and problem-solving make a real difference in day-to-day operations. As our business has grown, Pinnacle has continued to elevate their level of service, adapting to our needs while maintaining professionalism and reliability. We value the partnership greatly and appreciate the trust, collaboration, and support they provide.",
    excerpt: "Their support goes far beyond basic sales representation — they are responsive, proactive, and consistently invested in helping both our staff and our clients succeed.",
    name: "Wendy Sprague",
    dealership: "All About Cabinets and Countertops",
    url: "https://www.allaboutcandc.com/",
    image: "/images/brands/dealer-all-about.webp",
    published: true,
    featured: true,
  },
  {
    slug: "sullivan-studio-ii-designs-paula-tormey",
    quote: "Anna Fisher is a valuable tool for us in selling the full suite of WW Wood Products. She is very kind & patient, even when we send her the most convoluted questions! Her depth of knowledge is impressive and she always offers insight to all aspects of selling WW Wood Products. We are very lucky to have her as a resource.",
    name: "Paula Tormey",
    dealership: "Sullivan Studio II Designs",
    url: "https://www.studio2designs.com/",
    image: "/images/brands/dealer-studio2.webp",
    published: true,
  },
  {
    slug: "studio-ii-amy-vitelli",
    quote: "I have nothing but the utmost appreciation and respect for our representatives at Pinnacle Sales group. Without them, I would not have been able to develop my skills and business to the level it is today. Anna and Scott are easy to approach and receive questions, requests, and suggestions with an open mind. Their professional, nurturing and timely responses have been instrumental in assisting us in building our solid knowledge base as well as keeping us progressing with the industry. Going above and beyond like lending out personal samples for the unexpected urgent project, or making sure concise and correct information is provided. I feel fortunate to be able to collaborate with Anna and the Pinnacle Sales team.",
    name: "Amy Vitelli",
    role: "Kitchen & Bath Designer, Co-Owner",
    dealership: "Studio II",
    url: "https://www.studio2designs.com/",
    image: "/images/testimonial-studio2-amy.webp",
    published: true,
  },
];

export const publishedTestimonials = testimonials.filter(t => t.published);
