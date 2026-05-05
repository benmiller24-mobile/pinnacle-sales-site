// Curated dealer-project gallery for /projects/
// Image files live in /public/images/projects/<slug>/

export interface ProjectImage {
  src: string;
  alt: string;
}

export interface Project {
  slug: string;
  title: string;
  dealer: string;
  dealerWebsite?: string;
  brand: 'Shiloh' | 'Eclipse' | 'Aspect' | 'Pronorm' | 'Vistora' | 'Multiple';
  brandSlug: 'shiloh-cabinetry' | 'eclipse-cabinetry' | 'aspect-cabinetry' | 'pronorm-german-kitchens' | 'vistora-closets' | null;
  spaceType: 'Kitchen' | 'Whole Home' | 'Showroom';
  location: string;
  state: string;
  blurb: string;
  body?: string;            // optional longer narrative on the project page
  relatedPostSlug?: string; // existing /playbook post that goes with this project
  hero: string;             // path under /images/projects/<slug>/
  images: ProjectImage[];
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: 'plum-kitchens-cook-street',
    title: 'Cook Street Kitchen — Plum Kitchens',
    dealer: 'Plum Kitchens',
    brand: 'Shiloh',
    brandSlug: 'shiloh-cabinetry',
    spaceType: 'Kitchen',
    location: 'Denver, CO',
    state: 'Colorado',
    blurb: "A clean, contemporary Shiloh Cabinetry kitchen in Denver's Cook Street neighborhood — designed and installed by Plum Kitchens, one of our long-running Colorado dealer partners.",
    body: "Plum Kitchens is one of the standout Shiloh Cabinetry dealers in the Front Range. The Cook Street project shows how Shiloh handles a transitional, light-and-bright kitchen — cabinetry that disappears into the architecture rather than competing with it. For the deeper story on the dealership and how they've built their business, see the spotlight in the Playbook.",
    relatedPostSlug: 'dealer-spotlight-plum-kitchens',
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp',  alt: 'Plum Kitchens Cook Street kitchen — overall view, Shiloh Cabinetry' },
      { src: '02.webp',       alt: 'Plum Kitchens Cook Street kitchen — island and range view' },
      { src: '03.webp',       alt: 'Plum Kitchens Cook Street kitchen — cabinetry detail' },
      { src: '04.webp',       alt: 'Plum Kitchens Cook Street kitchen — perimeter run' },
      { src: '05.webp',       alt: 'Plum Kitchens Cook Street kitchen — adjacent dining area' },
    ],
    featured: true,
  },
  {
    slug: 'greenwood-cabinetry-betsy',
    title: 'The Betsy Project — Greenwood Cabinetry',
    dealer: 'Greenwood Cabinetry',
    brand: 'Pronorm',
    brandSlug: 'pronorm-german-kitchens',
    spaceType: 'Kitchen',
    location: 'Colorado',
    state: 'Colorado',
    blurb: "A Pronorm German Kitchen install by Greenwood Cabinetry — flush-mounted Miele coffee, glass uppers, and a full-height pantry/fridge wall that lets the cabinetry do the architecture.",
    body: "Greenwood Cabinetry is one of the Pronorm dealers we've built the closest collaboration with — they joined us at the WW Wood factory in 2025, and projects like 'Betsy' are why. The integrated Miele coffee pull-out and the glass-cabinet wall opposite the fridge column are both signature Pronorm moves, executed cleanly.",
    relatedPostSlug: 'greenwood-kitchens-factory-visit',
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp',     alt: 'Greenwood Cabinetry Pronorm kitchen — overall view' },
      { src: '02-sink-wall.webp', alt: 'Greenwood Cabinetry Pronorm kitchen — sink wall' },
      { src: '03-fridge-wall.webp', alt: 'Greenwood Cabinetry Pronorm kitchen — fridge column with glass cabinet wall' },
      { src: '04-miele-coffee.webp', alt: 'Greenwood Cabinetry Pronorm kitchen — flush-installed Miele coffee station' },
    ],
    featured: true,
  },
  {
    slug: 'excelle-shiloh-inset',
    title: 'Excelle Custom Cabinetry — Shiloh Inset',
    dealer: 'Excelle Custom Cabinetry',
    brand: 'Shiloh',
    brandSlug: 'shiloh-cabinetry',
    spaceType: 'Kitchen',
    location: 'Colorado',
    state: 'Colorado',
    blurb: "Excelle Custom Cabinetry's Shiloh inset showroom kitchen — the project that anchors our Excelle dealer story. Tight inset reveals, painted finish, traditional details done with restraint.",
    body: "Inset Shiloh executed at this level is what separates good cabinet shops from great ones. Excelle's team carries the line with a sensitivity to proportion and finish that makes Shiloh look custom even at semi-custom price points.",
    relatedPostSlug: 'excelle-shiloh-inset',
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp', alt: 'Excelle Shiloh inset kitchen — overall view' },
      { src: '02.webp',      alt: 'Excelle Shiloh inset kitchen — perimeter cabinetry' },
      { src: '03.webp',      alt: 'Excelle Shiloh inset kitchen — island detail' },
      { src: '04.webp',      alt: 'Excelle Shiloh inset kitchen — close-up detail' },
      { src: '05.webp',      alt: 'Excelle Shiloh inset kitchen — full perspective' },
    ],
    featured: true,
  },
  {
    slug: 'kitchens-by-good-guys-aster',
    title: 'Aster Project — Kitchens by Good Guys',
    dealer: 'Kitchens by Good Guys',
    brand: 'Multiple',
    brandSlug: null,
    spaceType: 'Kitchen',
    location: 'Arizona',
    state: 'Arizona',
    blurb: "A polished installed kitchen by Kitchens by Good Guys, photographed on location. Tight detailing, integrated appliances, and a confident island silhouette.",
    body: "Kitchens by Good Guys delivers some of the cleanest installed work in our Arizona territory. The Aster project is a good study in how to use cabinetry to organize a long, open-plan room — the island anchors the space without crowding it.",
    hero: '06-hero.webp',
    images: [
      { src: '06-hero.webp', alt: 'Kitchens by Good Guys — Aster project, overall hero view' },
      { src: '01.webp', alt: 'Kitchens by Good Guys — Aster project, perimeter run' },
      { src: '02.webp', alt: 'Kitchens by Good Guys — Aster project, range and hood' },
      { src: '03.webp', alt: 'Kitchens by Good Guys — Aster project, island silhouette' },
      { src: '04.webp', alt: 'Kitchens by Good Guys — Aster project, cabinetry detail' },
      { src: '05.webp', alt: 'Kitchens by Good Guys — Aster project, dining area perspective' },
    ],
  },
  {
    slug: 'kitchens-by-good-guys-ajo',
    title: 'Ajo Project — Kitchens by Good Guys',
    dealer: 'Kitchens by Good Guys',
    brand: 'Multiple',
    brandSlug: null,
    spaceType: 'Kitchen',
    location: 'Arizona',
    state: 'Arizona',
    blurb: "A second Kitchens by Good Guys install — warmer palette, full-overlay cabinetry, and a generous prep-and-gather plan.",
    body: "Where Aster is cool and architectural, Ajo leans warm and welcoming. Two distinct kitchens from the same dealer, photographed in real homes — the kind of range that gives confidence to homeowners shopping by showroom alone.",
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp', alt: 'Kitchens by Good Guys — Ajo project, overall view' },
      { src: '02.webp', alt: 'Kitchens by Good Guys — Ajo project, second view' },
      { src: '03.webp', alt: 'Kitchens by Good Guys — Ajo project, third view' },
      { src: '04.webp', alt: 'Kitchens by Good Guys — Ajo project, fourth view' },
      { src: '05.webp', alt: 'Kitchens by Good Guys — Ajo project, fifth view' },
    ],
  },
  {
    slug: 'builders-floor-and-designs',
    title: 'Builders Floor and Designs — Kitchen Install',
    dealer: 'Builders Floor and Designs',
    brand: 'Multiple',
    brandSlug: null,
    spaceType: 'Kitchen',
    location: 'Western US',
    state: 'Colorado',
    blurb: "A finished kitchen by Builders Floor and Designs, captured from five angles — overall, opposite-angle, island, cooktop wall, and sink wall.",
    body: "Five clean angles of the same room — the kind of coverage we always recommend when a dealer has a finished install worth photographing. Together the images give a homeowner enough to imagine the room without the dealer having to walk them through it.",
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp',     alt: 'Builders Floor and Designs kitchen — overall straight-on view' },
      { src: '02-angle.webp',    alt: 'Builders Floor and Designs kitchen — overall from angle' },
      { src: '03-island.webp',   alt: 'Builders Floor and Designs kitchen — island detail' },
      { src: '04-cooktop.webp',  alt: 'Builders Floor and Designs kitchen — cooktop and hood close-up' },
      { src: '05-sink-wall.webp', alt: 'Builders Floor and Designs kitchen — sink wall from corner' },
    ],
  },
  {
    slug: 'timberline',
    title: 'Timberline — Dealer Project',
    dealer: 'Timberline',
    brand: 'Multiple',
    brandSlug: null,
    spaceType: 'Kitchen',
    location: 'Western US',
    state: 'Western US',
    blurb: 'A short selection from the Timberline dealer portfolio.',
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp', alt: 'Timberline project — first view' },
      { src: '02.webp',      alt: 'Timberline project — second view' },
      { src: '03.webp',      alt: 'Timberline project — third view' },
    ],
  },
  {
    slug: 'caruso-kitchen-designs-showroom',
    title: 'Caruso Kitchen Designs — Showroom',
    dealer: 'Caruso Kitchen Designs',
    brand: 'Eclipse',
    brandSlug: 'eclipse-cabinetry',
    spaceType: 'Showroom',
    location: 'Colorado',
    state: 'Colorado',
    blurb: "Inside Caruso Kitchen Designs' Eclipse-led showroom — a working space that doubles as a portfolio for finished homeowner installs.",
    body: "Caruso runs one of the most cohesive Eclipse showrooms in our territory. If you want the longer story on how they're combining showroom display with real-home video walkthroughs to drive leads, the playbook post breaks it down.",
    relatedPostSlug: 'caruso-kitchens-eclipse-showroom',
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp', alt: 'Caruso Kitchen Designs showroom — overall view' },
      { src: '02.webp',      alt: 'Caruso Kitchen Designs showroom — display detail' },
      { src: '03.webp',      alt: 'Caruso Kitchen Designs showroom — secondary display' },
    ],
  },
  {
    slug: 'boulder-whole-home',
    title: 'Boulder Whole Home',
    dealer: 'Pinnacle Sales Dealer Partner',
    brand: 'Multiple',
    brandSlug: null,
    spaceType: 'Whole Home',
    location: 'Boulder, CO',
    state: 'Colorado',
    blurb: "A multi-room install in Boulder — kitchen, dining, laundry, powder bath, and primary closet — showing how cabinetry pulls a whole home together when the same dealer carries every space.",
    body: "Most of our gallery is single-room installs. This Boulder home is the exception worth showing: when one dealer carries a homeowner across kitchen, laundry, powder bath, and closets, the result feels architectural instead of pieced together. It's also a good reminder for prospective homeowners: ask your kitchen dealer what else they can do.",
    hero: '01-hero.webp',
    images: [
      { src: '01-hero.webp',       alt: 'Boulder whole home — kitchen overall view' },
      { src: '02-kitchen.webp',    alt: 'Boulder whole home — kitchen detail' },
      { src: '03-dining.webp',     alt: 'Boulder whole home — dining area' },
      { src: '04-laundry.webp',    alt: 'Boulder whole home — laundry room cabinetry' },
      { src: '05-powder-bath.webp', alt: 'Boulder whole home — powder bath vanity' },
      { src: '06-closet.webp',     alt: 'Boulder whole home — primary closet' },
    ],
  },
];

export function projectBySlug(slug: string) {
  return projects.find(p => p.slug === slug);
}
