// Hero Images
import heroCaribbean2 from '@/assets/images/hero/caribbean-2.jpg';
import heroLa1 from '@/assets/images/hero/la-1.jpg';
import heroLa2 from '@/assets/images/hero/la-2.png';
import heroNyc1 from '@/assets/images/hero/nyc-1.jpg';
import heroNyc2 from '@/assets/images/hero/nyc-2.jpg';
import heroNyc4 from '@/assets/images/hero/nyc-4.jpg';
import hero3 from '@/assets/images/hero/hero 3.jpg';
import hero4 from '@/assets/images/hero/hero_2.jpg';

// Service Images
import serviceConcept from '@/assets/images/services/service-concept.jpeg';
import serviceInvestment from '@/assets/images/services/service-investment.jpg';
import serviceConstruction from '@/assets/images/services/service-construction.jpg';
import serviceOperations from '@/assets/images/services/service-operations.jpg';
import serviceLegal from '@/assets/images/services/service-legal.jpg';
import serviceAccounting from '@/assets/images/services/service-accounting.jpg';
import serviceTraining from '@/assets/images/services/service-training.jpg';

// Work Images
import initialBriefingImg from '@/assets/images/work/initial-briefing.jpg';
import auditDiagnosisImg from '@/assets/images/work/Audit and Clear Diagnosis.png';
import practicalPlanImg from '@/assets/images/work/Practical Plan.png';
import projectManagementImg from '@/assets/images/work/Project Management.png';
import realResultsImg from '@/assets/images/work/Real Results.jpg';


// Portfolio Images
import hotelsImg from '@/assets/images/our_work/hotels.jpg';
import restaurantImg from '@/assets/images/our_work/restaurant.jpg';
import nightlifeImg from '@/assets/images/our_work/nightlife.jpg';
import privateClubImg from '@/assets/images/our_work/private club 1.jpg';
import eventsImg from '@/assets/images/our_work/events.jpg';
import residentImg from '@/assets/images/our_work/resident_1.jpg';

// Testimonial Logos
import etcVenuesLogo from '@/assets/images/logos/etc-venues.png';
import azumiLogo from '@/assets/images/logos/azumi.png';
import paperchaseLogo from '@/assets/images/testimonials/paperchaseaccountancy_logo.jpg';
import beverlyHiltonLogo from '@/assets/images/logos/beverly-hilton.png';

// Hero Slideshow Images - NYC, LA, Caribbean
export const HERO_IMAGES = [

  hero4,
  hero3,
  heroNyc4,
  heroLa1,
  heroNyc1,
  heroLa2,
  heroCaribbean2,
  heroNyc2

];

// Services with background images
export const SERVICES_DATA = [
  {
    title: "Concept Creation",
    description: "We help guide your hospitality concepts from ideation through to delivering market ready, creative outcomes.",
    descriptionList: [
      "Ideation and early-stage concept development",
      "Concept inception and positioning",
      "Structured brainstorming and refinement",
      "Market research and competitive analysis",
      "Market and site identification and sourcing"
    ],
    bgImage: serviceConcept,
    anchor: "concept-creation"
  },
  {
    title: "Capital & Growth Investment",
    description: "We provide strategic advice  and guidance on growth and investment, capital sourcing, M&A’s and create investor-ready business plans.",
    descriptionList: [
      "Growth capital and investment sourcing",
      "Mergers and acquisitions support",
      "Business planning and investor-ready models"
    ],
    bgImage: serviceInvestment,
    anchor: "capital-growth-investment"
  },
  {
    title: "Design, Development & Construction",
    description: "We provide skilled “Owners Rep” oversight through each phase of design and construction to deliver your projects successfully.",
    descriptionList: [
      "Conceptual design briefing aligned to client and tenant needs",
      "Schematic design coordination with design and consultant teams",
      "Value engineering reviews to protect budgets and functionality",
      "Contract review and risk assessment",
      "Design development and style narrative definition",
      "RFP and bidding process management",
      "Construction documentation and approvals",
      "End-to-end project management",
      "Change order review and cost control",
      "Coordination of lighting, AV, FF&E, and specialty elements"
    ],
    bgImage: serviceConstruction,
    anchor: "design-development-construction"
  },
  {
    title: "Operations",
    description: "We help deliver end-to-end operations excellence and efficiency from pre and post opening to ongoing operational management.",
    descriptionList: [
      "Pre-opening planning and operational standards creation",
      "Launch and opening support",
      "Post-opening stabilization",
      "Day-to-day operational leadership and advisory",
      "SOP creation, review, and implementation",
      "Full operational audits, including secret shops",
      "Sales and marketing strategy and execution",
      "Revenue management and performance optimization",
      "HR, recruitment, and team development",
      "Labor relations, collective bargaining, and union negotiations",
      "Logistics and procurement",
      "F&B menu planning, design, costing, and performance analysis"
    ],
    bgImage: serviceOperations,
    anchor: "operations"
  },
  {
    title: "Legal",
    description: "We help you manage the legal foundations that protect your deals, teams, and long-term operations.",
    descriptionList: [
      "Lease review and negotiations",
      "Licensing and permitting",
      "Contract review and negotiations",
      "Employment and labor support"
    ],
    bgImage: serviceLegal,
    anchor: "legal"
  },
  {
    title: "Financial",
    description: "We provide end-to-end insightful financial guidance, on budgeting, forecasting, audits, cost control, efficiency and profitability.",
    descriptionList: [
      "Project and operational budgeting and forecasting",
      "Full and partial financial audits",
      "Cost analysis and control systems",
      "Profitability and performance analysis",
      "M&A financial support",
      "Sale and exit preparation",
      "Business dissolution support"
    ],
    bgImage: serviceAccounting,
    anchor: "financial"
  },
  {
    title: "Additional Support",
    description: "We provide targeted support wherever your business may need experienced hospitality operator guidance and oversight.",
    descriptionList: [
      "Every Hospitality Business and Project has unique attributes ~ We are here to support whatever you may need."
    ],
    bgImage: serviceTraining,
    anchor: "additional-support"
  }
];

// How We Work with images
export const HOW_WE_WORK = [
  {
    number: "01",
    title: "Initial Briefing",
    description: "We take the necessary time understanding our client’s needs, starting with core objectives, opportunities and challenges. Then, working colaboratively with you  to agree best approach and actionable next steps.",
    image: initialBriefingImg
  },
  {
    number: "02",
    title: "Audit and Clear Diagnosis",
    description: "We spend time on site with you and your key team players to observe and audit your project or business appropriately.  We get under the hood to advise on potential risks and opportunities with the best direction forward.  Where there are challenges, we identify root causes, quantify the impact. We provide clear recommendations and real solutions.",
    image: auditDiagnosisImg
  },
  {
    number: "03",
    title: "Practical Plan",
    description: "We build a focused roadmap with specific actions, clear timelines, and realistic outcomes. You'll know what we're doing, when, and what results to expect.",
    image: practicalPlanImg
  },
  {
    number: "04",
    title: "Project Management ~ Hands-On Implementation",
    description: "Where appropriate we work on-site with you and your team, helping build systems, managing, supporting and solving for the unexpected. We will help ensure proper implementation and successful completion for every project.",
    image: realResultsImg
  },
  {
    number: "05",
    title: "Real Results",
    description: "When we leave, you and your team know how to maintain what we collectively build.  Solutions that stick.  Performance that lasts. You and the project are set for success.",
    image: projectManagementImg
  }
];

// Portfolio projects
export const PORTFOLIO_PROJECTS = [
  {
    title: "Hotels & Resorts",
    image: hotelsImg
  },
  {
    title: "Restaurants & Bars",
    image: restaurantImg
  },
  {
    title: "Nightlife & Entertainment",
    image: nightlifeImg
  },
  {
    title: "Private & Member-Only Clubs",
    image: privateClubImg
  },
  {
    title: "Meeting & Event Venues",
    image: eventsImg
  },
  {
    title: "Residential & CRE Amenities",
    image: residentImg
  },
];

// Testimonials with logos
export const TESTIMONIALS = [
  {
    quote: "Garrett was a key member of the leadership team during a pivotal phase of etc.venues’ international expansion. He successfully built out and established the company in the US overseeing development and operations. Despite the challenges of Covid, Garrett opened three new venues. He also launched a new consulting vertical, partnering with leading NYC CRE developers to design and deliver innovative tenant amenity spaces. A dependable leader throughout a successful M&A with Convene, he consistently delivered exceptional results and comes highly recommended.",
    highlight: "consistently delivered exceptional results",
    name: "Nick Hoare",
    author: "Former Managing Director",
    logo: etcVenuesLogo
  },
  {
    quote: "I’ve known and worked with Garrett for many years. He Joined Azumi in 2013 and led the US for us in all aspects of development and operations. He oversaw the successful opening of Zuma flagship locations in NYC on Madison Ave, Las Vegas at The Cosmopolitan & Boston at The Four Seasons; spearheaded opening two Etaru’s in South Florida and was instrumental in the creation and opening of two of our first ever “Inko Nito’s” in Los Angeles. To this day, we still look to Garrett for his expertise and guidance in certain aspects of our US business",
    highlight: "instrumental in the creation and opening",
    name: "Sven Koch",
    author: "CEO",
    logo: azumiLogo,
    invertLogo: true
  },
  {
    quote: "Having worked with Garrett for over a decade, I have consistently been impressed by his expertise and command of the hospitality industry. He combines sharp financial acumen with deep experience across operations, development, start-up buildouts, C-suite leadership, M&A activity, and end-to-end project management — always with a meticulous, detail-oriented approach. As a business owner, I genuinely value Garrett’s perspective; he brings clarity, structure, and strategic insight to every challenge. He is someone I trust to deliver and a talent I would welcome as part of any company’s senior leadership and strategic planning team.",
    highlight: "stayed until it was fixed",
    name: "Nish Patel",
    author: "Group CEO",
    logo: paperchaseLogo
  },
  {
    quote: "Garrett is one of the most intuitive, loyal, and dynamic hospitality leaders I have had the pleasure to work with. As Director of F&B at The Beverly Hilton, he played a pivotal role in transforming our food, beverage, and banquet operations during a landmark multi-million-dollar refurbishment and rebranding. He successfully reimagined every outlet while elevating service standards across a 570-room property and 55,000 square feet of conference and banquet space, including events on the scale of the Golden Globe Awards. Garrett inspired and led a team of over 700 colleagues through meaningful cultural change, combining operational rigor with financial discipline and genuine care for people. His experience, collaborative leadership style, and unwavering commitment to excellence make him an exceptional asset to any hospitality organization.",
    highlight: "transforming our food, beverage, and banquet operations",
    name: "Denny Fitzpatrick",
    author: "Former General Manager",
    logo: beverlyHiltonLogo
  }
];
