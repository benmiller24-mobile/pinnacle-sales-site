#!/bin/bash
cd /home/claude/pinnacle-site

#----- BRAND: SHILOH -----
cat > src/pages/brands/shiloh-cabinetry.astro << 'EOF'
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import DealerCTA from '../../components/DealerCTA.astro';
const schema = {"@context":"https://schema.org","@type":"Product","name":"Shiloh Cabinetry","brand":{"@type":"Brand","name":"Shiloh Cabinetry"},"description":"American-made semi-custom cabinetry with dovetail drawers, full-extension glides, and soft-close hinges.","category":"Kitchen Cabinetry","manufacturer":{"@type":"Organization","name":"WW Wood Products"}};
---
<BaseLayout title="Shiloh Cabinetry | Dealer Information & Product Details | Pinnacle Sales" description="Become a Shiloh Cabinetry dealer through Pinnacle Sales. Family-owned, American-made semi-custom cabinetry with diverse customization. Available in AZ, CA, CO, ID, NV, NM, OR, WA." schema={schema}>
<div class="page-header"><h1>Shiloh Cabinetry — American-Made Semi-Custom Excellence</h1><p>Family-owned craftsmanship since 1977. Face-frame and inset construction with unmatched customization.</p></div>
<div class="content-narrow section">
<Breadcrumbs items={[{name:'Home',href:'/'},{name:'Brands',href:'/#brands'},{name:'Shiloh Cabinetry'}]} />
<p>Shiloh Cabinetry is a family-owned, American-made brand renowned for its product value and diverse customization options. Built by W.W. Wood Products Inc. in Dudley, Missouri since 1977, Shiloh offers a wide range of styles, finishes, and wood species that allow homeowners and designers to create unique, tailored cabinetry solutions that suit any design aesthetic.</p>
<h2>Construction & Quality</h2>
<p>Shiloh emphasizes quality and value, offering premium construction features like dovetail drawers, full-extension glides, and soft-close hinges at a competitive price point. All cabinetry is built-to-order with all-plywood box construction.</p>
<h2>Inset Cabinetry — 6 Styles, No Upcharge</h2>
<p>Shiloh's Inset Cabinetry is available in six unique styles — Flush Inset, Modern Flush Inset, Beaded Inset, Modern Beaded Inset, Square Beaded Inset, and Modern Square Beaded Inset — all at nearly the same price point as full overlay frameless Eclipse.</p>
<h2>Custom Paint Program</h2>
<p>Shiloh's Custom Paint Program allows dealers to spec any "Standard" paint color from Sherwin-Williams. Custom color adds a 20% upcharge with a $15,000 minimum order, or a flat $750 fee for smaller jobs.</p>
<h2>Key Features</h2>
<ul><li>All-plywood box construction</li><li>Dovetail drawer boxes with full-extension soft-close guides</li><li>No-upcharge White Oak and Rift-Cut options</li><li>6 inset variations at no additional cost</li><li>Extensive stain and paint finish library</li><li>Multiple wood species: Maple, Cherry, Walnut, Hickory, Alder, White Oak</li><li>Slatted wood range hoods, end caps, and panels</li><li>Furniture vanities handcrafted from scratch</li><li>Approximately 6-week lead times</li></ul>
<h2>Related Playbook Articles</h2>
<ul><li><a href="/playbook/frameless-vs-face-frame-cabinets">Frameless vs. Face-Frame Cabinets</a></li><li><a href="/playbook/modern-inset">Modern Inset: 6 No Upcharge Variations</a></li><li><a href="/playbook/custom-paint-sherwin-williams">Custom Paint with Sherwin-Williams</a></li><li><a href="/playbook/slatted-wood-series">Slatted Wood Series</a></li></ul>
<DealerCTA heading="Become a Shiloh Cabinetry Dealer" text="Join our dealer network across Arizona, California, Colorado, Idaho, Nevada, New Mexico, Oregon, and Washington." />
</div>
</BaseLayout>
EOF

#----- BRAND: ECLIPSE -----
cat > src/pages/brands/eclipse-cabinetry.astro << 'EOF'
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import DealerCTA from '../../components/DealerCTA.astro';
const schema = {"@context":"https://schema.org","@type":"Product","name":"Eclipse Cabinetry","brand":{"@type":"Brand","name":"Eclipse Cabinetry"},"description":"Modern frameless cabinetry with full-access construction, sleek design, and premium soft-close features.","category":"Kitchen Cabinetry","manufacturer":{"@type":"Organization","name":"WW Wood Products"}};
---
<BaseLayout title="Eclipse Cabinetry | Frameless Full-Access Cabinetry | Pinnacle Sales" description="Eclipse Cabinetry offers modern frameless full-access cabinetry with sleek design and premium features. Available through Pinnacle Sales dealers in 8 Western states." schema={schema}>
<div class="page-header"><h1>Eclipse Cabinetry — Modern Frameless Full-Access Design</h1><p>European-inspired frameless construction with American craftsmanship. Up to 15% more usable storage.</p></div>
<div class="content-narrow section">
<Breadcrumbs items={[{name:'Home',href:'/'},{name:'Brands',href:'/#brands'},{name:'Eclipse Cabinetry'}]} />
<p>Eclipse Cabinetry is a modern, frameless cabinetry line that combines sleek, contemporary design with superior functionality. Built by W.W. Wood Products in Missouri, Eclipse offers clean lines, full-access storage, and a wide selection of finishes. Its frameless construction maximizes usable space, while premium features like soft-close doors and drawers ensure a seamless, high-end user experience.</p>
<h2>Why Frameless?</h2>
<p>Without the face frame reducing the opening, drawers and pull-out accessories can be wider, providing up to 15% more usable storage in the same cabinet footprint. The full-overlay doors create a sleek, seamless appearance with minimal reveal lines.</p>
<h2>Finish Options</h2>
<p>Eclipse offers a broad finish palette including stains, paints, wood veneers, super-matte acrylics, matte laminates, high-pressure laminates, thermofoils, and textured melamine. Custom paints via Sherwin-Williams fan decks are also available.</p>
<h2>Key Features</h2>
<ul><li>Frameless full-access construction inspired by European design</li><li>Dovetail drawer boxes with soft-close undermount guides</li><li>Wide selection of finishes: stains, paints, HPL, thermofoil</li><li>Custom paint program via Sherwin-Williams</li><li>Slatted wood range hoods and panels available</li><li>Competitive lead times from Missouri factory</li></ul>
<h2>Related Playbook Articles</h2>
<ul><li><a href="/playbook/frameless-vs-face-frame-cabinets">Frameless vs. Face-Frame Cabinets</a></li><li><a href="/playbook/eclipse-merchandiser-display">Eclipse Merchandiser Display</a></li><li><a href="/playbook/showcasing-installed-projects">Showcasing Installed Projects</a></li></ul>
<DealerCTA heading="Become an Eclipse Cabinetry Dealer" text="Offer your clients modern frameless design backed by WW Wood's American craftsmanship." />
</div>
</BaseLayout>
EOF

#----- BRAND: ASPECT -----
cat > src/pages/brands/aspect-cabinetry.astro << 'EOF'
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import DealerCTA from '../../components/DealerCTA.astro';
const schema = {"@context":"https://schema.org","@type":"Product","name":"Aspect Cabinetry","brand":{"@type":"Brand","name":"Aspect Cabinetry"},"description":"Value-driven semi-custom cabinetry with quality construction and affordable pricing.","category":"Kitchen Cabinetry","manufacturer":{"@type":"Organization","name":"WW Wood Products"}};
---
<BaseLayout title="Aspect Cabinetry | Value Semi-Custom Cabinetry | Pinnacle Sales" description="Aspect Cabinetry offers quality semi-custom cabinetry at accessible price points. Perfect for budget-conscious projects without compromising craftsmanship." schema={schema}>
<div class="page-header"><h1>Aspect Cabinetry — Quality Semi-Custom at Accessible Pricing</h1><p>The smart choice for beautiful, practical spaces without compromising on craftsmanship.</p></div>
<div class="content-narrow section">
<Breadcrumbs items={[{name:'Home',href:'/'},{name:'Brands',href:'/#brands'},{name:'Aspect Cabinetry'}]} />
<p>Aspect Cabinetry offers a perfect blend of quality, style, and affordability, making it an ideal choice for homeowners seeking value-driven semi-custom cabinetry. With a versatile selection of door styles, finishes, and storage solutions, Aspect delivers on both functionality and aesthetics. Its durable construction and attention to detail ensure long-lasting performance, while its competitive pricing makes quality cabinetry accessible for a variety of budgets.</p>
<h2>Who It's For</h2>
<p>Aspect is the go-to line for builder projects and budget-conscious remodels where the same WW Wood Products build quality is expected at a lower price point. Aspect offers the same finish and build quality as Shiloh and Eclipse but with fewer customization and color choices.</p>
<h2>Key Features</h2>
<ul><li>Built-to-order in the USA by WW Wood Products</li><li>Same finish quality as Shiloh and Eclipse lines</li><li>Competitive pricing for builder and value-tier projects</li><li>Versatile door styles and finish options</li><li>Soft-close hinges and drawer guides standard</li></ul>
<DealerCTA heading="Become an Aspect Cabinetry Dealer" text="Give your clients quality American cabinetry at competitive price points." />
</div>
</BaseLayout>
EOF

#----- BRAND: PRONORM -----
cat > src/pages/brands/pronorm-german-kitchens.astro << 'EOF'
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import DealerCTA from '../../components/DealerCTA.astro';
const schema = {"@context":"https://schema.org","@type":"Product","name":"Pronorm German Kitchens","brand":{"@type":"Brand","name":"Pronorm"},"description":"Premium fitted German kitchen brand with sleek contemporary designs, precision engineering, and sustainable manufacturing.","category":"Kitchen Cabinetry","manufacturer":{"@type":"Organization","name":"Pronorm Einbauküchen GmbH"}};
---
<BaseLayout title="Pronorm German Kitchens | Exclusive US Dealer | Pinnacle Sales" description="Pronorm German kitchens available in the US exclusively through Pinnacle Sales. Precision-engineered fitted kitchens with sustainable manufacturing. Available nationwide." schema={schema}>
<div class="page-header"><h1>Pronorm German Kitchens — Precision Engineering, Timeless Design</h1><p>Exclusive US agent for one of Germany's most respected fitted kitchen manufacturers. Available nationwide.</p></div>
<div class="content-narrow section">
<Breadcrumbs items={[{name:'Home',href:'/'},{name:'Brands',href:'/#brands'},{name:'Pronorm German Kitchens'}]} />
<p>Pronorm Einbauküchen is a premium fitted German kitchen brand known for its sleek, contemporary designs and exceptional functionality. With a focus on modularity and customization, Pronorm offers a wide range of finishes, materials, and innovative storage solutions to create tailored kitchens that combine style and practicality. Built with precision engineering and high-quality craftsmanship in Vlotho, Eastern Westphalia — the heart of Germany's kitchen industry.</p>
<h2>German Engineering, American Support</h2>
<p>Through an exclusive partnership with Pinnacle Sales, Pronorm German kitchens are available to qualified dealers and discerning homeowners across the United States. Pinnacle Sales manages product specification, design consultation, order management, logistics coordination from the German factory, and after-sale service.</p>
<h2>Construction Excellence</h2>
<p>Pronorm uses 19mm thick panels throughout (compared to 16mm from many competitors), providing greater structural rigidity. All carcasses feature fully finished interiors, integrated cable management, and pre-drilled adjustment points. Hardware is sourced from Blum, Hettich, and Grass with soft-close standard on every door and drawer.</p>
<h2>Product Lines</h2>
<ul><li><strong>Y-Line:</strong> Handleless construction with integrated aluminum channel profiles</li><li><strong>Modern Shaker LF:</strong> Refined reinterpretation of the classic shaker with ultra-thin stiles and rails</li><li><strong>Boho Textured White Oak:</strong> Softly sculpted relief-style vertical texture in warm natural oak</li></ul>
<h2>Design Range</h2>
<p>Hundreds of door front options spanning high-gloss lacquer, super-matte anti-fingerprint surfaces, real wood veneers (oak, walnut, specialty species), and ultra-thin ceramic and stone-look fronts. Full palette of matte lacquers and textured laminates.</p>
<h2>Pricing & Market Position</h2>
<p>Pronorm fills the critical gap between entry-level German brands and ultra-premium names like SieMatic and Poggenpohl. Typical installations range from $40,000 to $150,000+, with strong dealer margins and design exclusivity.</p>
<h2>Related Playbook Articles</h2>
<ul><li><a href="/playbook/pronorm-german-kitchens-usa">Complete Guide to Pronorm in the United States</a></li><li><a href="/playbook/pronorm-boho-textured-white-oak">Boho Textured White Oak Display</a></li><li><a href="/playbook/pronorm-modern-shaker-lf">Modern Shaker LF Door Style</a></li><li><a href="/playbook/japan-inspired-kitchens">Japan-Inspired Kitchens with Pronorm</a></li></ul>
<DealerCTA heading="Become a Pronorm Dealer" text="Offer your clients authentic German kitchen design with dedicated US support. Protected territories available nationwide." />
</div>
</BaseLayout>
EOF

#----- BRAND: VISTORA -----
cat > src/pages/brands/vistora-closets.astro << 'EOF'
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import DealerCTA from '../../components/DealerCTA.astro';
const schema = {"@context":"https://schema.org","@type":"Product","name":"Vistora Closets","brand":{"@type":"Brand","name":"Vistora"},"description":"Made-to-order closet solutions designed to maximize storage and enhance organization with style.","category":"Closet & Storage Systems"};
---
<BaseLayout title="Vistora Closets | Custom Closet & Storage Solutions | Pinnacle Sales" description="Vistora Closets offers made-to-order closet solutions with modern aesthetics and expert craftsmanship. Available through Pinnacle Sales dealers." schema={schema}>
<div class="page-header"><h1>Vistora Closets — Made-to-Order Storage Solutions</h1><p>Maximize storage and enhance organization with custom closet systems designed for modern living.</p></div>
<div class="content-narrow section">
<Breadcrumbs items={[{name:'Home',href:'/'},{name:'Brands',href:'/#brands'},{name:'Vistora Closets'}]} />
<p>Vistora Closets specializes in made-to-order closet solutions designed to maximize storage and enhance organization with style. Offering a variety of finishes, configurations, and accessories, Vistora combines functionality with modern aesthetics to create personalized spaces. With high-quality materials and expert craftsmanship, Vistora delivers durable and visually stunning designs tailored to fit any lifestyle.</p>
<h2>Why Add Closets to Your Dealership?</h2>
<p>Many kitchen customers also need pantry organization, walk-in closet systems, and mudroom storage. Vistora allows dealers to capture whole-home projects without referring that business elsewhere — increasing average project value without acquiring new customers.</p>
<h2>Key Features</h2>
<ul><li>Made-to-order for precise fit</li><li>Wide variety of finishes and configurations</li><li>Modern aesthetics with expert craftsmanship</li><li>Ideal for walk-in closets, reach-in closets, pantries, mudrooms, and home offices</li></ul>
<DealerCTA heading="Add Vistora Closets to Your Showroom" text="Capture whole-home projects by offering premium closet solutions alongside your kitchen cabinetry." />
</div>
</BaseLayout>
EOF

echo "Brand pages created"
