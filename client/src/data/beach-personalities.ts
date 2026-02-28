export type BeachVibe =
  | 'active'
  | 'quiet'
  | 'family'
  | 'dog-friendly'
  | 'sunset'
  | 'social'
  | 'nature'
  | 'urban';

export interface BeachPersonality {
  slug: string;
  archetype: string;
  tagline: string;
  editorial: string;
  differentiators: string[];
  vibes: BeachVibe[];
  instagramHashtag?: string;
  instagramPostUrls: string[];
  accentColor: string;
}

export const beachPersonalities: BeachPersonality[] = [
  {
    slug: 'english-bay',
    archetype: 'The Sunset Stage',
    tagline: "Vancouver's golden amphitheatre on the Pacific",
    editorial:
      "English Bay is the city's most iconic beach — a wide crescent of sand that transforms into a communal theatre every evening as the sun drops behind the mountains. From the Celebration of Light fireworks to quiet Tuesday evenings on the seawall, it is always on. The West End's energy spills right down to the water's edge.",
    differentiators: [
      'Best sunset viewpoint in central Vancouver',
      'Honda Celebration of Light fireworks host beach',
      'Steps from West End restaurants and the seawall',
    ],
    vibes: ['sunset', 'social', 'urban'],
    instagramHashtag: 'englishbay',
    instagramPostUrls: [],
    accentColor: 'amber',
  },
  {
    slug: 'jericho-beach',
    archetype: 'The Sailors Retreat',
    tagline: 'Where sails catch the mountain breeze',
    editorial:
      "Jericho is the unhurried counterpart to the busier westside beaches — wide grassy flats, calm sheltered water, and one of Canada's largest sailing clubs giving it a distinctly maritime character. The expansive picnic lawns and arts centre host summer festivals that feel more neighbourhood-scale than city-wide.",
    differentiators: [
      'Jericho Sailing Centre — largest in Canada',
      'Broad grassy picnic areas with mountain views',
      'Calmer and quieter than Kits or English Bay',
    ],
    vibes: ['active', 'quiet', 'family'],
    instagramHashtag: 'jerichobeach',
    instagramPostUrls: [],
    accentColor: 'ocean',
  },
  {
    slug: 'kitsilano-beach',
    archetype: 'The Sporty Heart',
    tagline: 'Where the west side comes to play',
    editorial:
      "Kits Beach is Vancouver's most popular beach — and for good reason. With volleyball courts, the massive saltwater Kits Pool, and views that stretch from downtown to the North Shore mountains, it's the social hub of the west side. The energy here is infectious from May through September.",
    differentiators: [
      '6 volleyball courts',
      'Kitsilano Pool — longest outdoor pool in Canada at 137m',
      'Busiest beach in Vancouver',
    ],
    vibes: ['active', 'social', 'family'],
    instagramHashtag: 'kitsbeach',
    instagramPostUrls: [],
    accentColor: 'coral',
  },
  {
    slug: 'locarno-beach',
    archetype: 'The Quiet Expanse',
    tagline: 'Peaceful shores and endless tidal flats',
    editorial:
      "Locarno is Vancouver's best-kept secret for those who want a beach without the crowd. At low tide the ocean retreats hundreds of metres, revealing a vast sandy playground for beachcombers and birders. Free parking, dog-friendly zones, and a relaxed pace make it the neighbourhood escape of choice for those in the know.",
    differentiators: [
      'Dramatic low-tide flats extending hundreds of metres',
      'Dog-friendly off-leash zones',
      'Free parking — rare on the westside',
    ],
    vibes: ['quiet', 'nature', 'dog-friendly'],
    instagramHashtag: 'locarnobeach',
    instagramPostUrls: [],
    accentColor: 'forest',
  },
  {
    slug: 'second-beach',
    archetype: 'The Family Classic',
    tagline: 'Stanley Park pool days and forest trails',
    editorial:
      'Second Beach delivers the full family beach experience with the towering old-growth forest of Stanley Park as backdrop. The large heated pool, well-equipped playground, and accessible seawall make it the go-to for families with young children. Arriving by seawall bike or on foot is half the adventure.',
    differentiators: [
      'Heated outdoor pool (seasonal)',
      'Playground within Stanley Park',
      'Accessible via Stanley Park seawall — no car needed',
    ],
    vibes: ['family', 'active', 'nature'],
    instagramHashtag: 'secondbeachvancouver',
    instagramPostUrls: [],
    accentColor: 'forest',
  },
  {
    slug: 'spanish-banks',
    archetype: 'The Wide Open',
    tagline: 'Vast sands, big kites, bigger mountains',
    editorial:
      "Spanish Banks is Vancouver's most expansive beach — stretching over three kilometres with views that take in the entire North Shore. At low tide the world opens up: kiteboarding, kite flying, and long barefoot walks feel limitless. And on warm evenings, the designated firepits make it one of the few places in the city where a legal bonfire on the sand is still possible.",
    differentiators: [
      'Firepits for legal beach bonfires',
      'Premier kiteboarding location',
      '3km of beach — the widest in Vancouver',
    ],
    vibes: ['active', 'nature', 'dog-friendly', 'sunset'],
    instagramHashtag: 'spanishbanks',
    instagramPostUrls: [],
    accentColor: 'amber',
  },
  {
    slug: 'sunset-beach',
    archetype: 'The Urban Connector',
    tagline: 'City skyline meets ocean breeze',
    editorial:
      'Sunset Beach sits at the intersection of urban life and waterfront — lining False Creek with views of the Burrard Bridge and city skyline reflected in the water. It is less a destination beach and more a living part of the city, connecting the West End to Granville Island via seawall and Aquabus. The vibe is active and transient, always interesting.',
    differentiators: [
      'Aquabus and False Creek Ferry stop nearby',
      'Burrard Bridge and city skyline views',
      'On the seawall between West End and Granville Island',
    ],
    vibes: ['urban', 'active', 'social'],
    instagramHashtag: 'sunsetbeachvancouver',
    instagramPostUrls: [],
    accentColor: 'coral',
  },
  {
    slug: 'third-beach',
    archetype: 'The Hidden Cove',
    tagline: 'Rainforest cove with bonfire sunsets',
    editorial:
      "Third Beach is Stanley Park's best-kept secret — a crescent of golden sand tucked beneath old-growth cedar and Douglas fir, accessible only by foot or bike. The seclusion keeps crowds manageable even on peak summer days, and the west-facing orientation delivers some of the finest sunsets in the city. Locals arrive early to claim a firepit spot before they disappear.",
    differentiators: [
      'No road access — seawall only keeps it quiet',
      'West-facing for spectacular sunsets with bonfire firepits',
      'Old-growth forest directly behind the beach',
    ],
    vibes: ['quiet', 'nature', 'sunset'],
    instagramHashtag: 'thirdbeach',
    instagramPostUrls: [],
    accentColor: 'forest',
  },
  {
    slug: 'trout-lake',
    archetype: 'The East Van Oasis',
    tagline: 'East Van freshwater escape and community hub',
    editorial:
      "Trout Lake is East Vancouver's beloved freshwater swimming hole — warm lake water, a sandy beach, and a community spirit that you just cannot find at the ocean beaches. Saturday mornings bring the famous Farmers Market right to the park, making a swim-and-shop morning a local institution. It is the neighbourhood beach for those who know.",
    differentiators: [
      'Freshwater lake — warmer than ocean in summer',
      'Trout Lake Farmers Market on Saturdays (May–October)',
      'East Van community hub — relaxed and welcoming',
    ],
    vibes: ['family', 'social', 'dog-friendly'],
    instagramHashtag: 'troutlakevancouver',
    instagramPostUrls: [],
    accentColor: 'forest',
  },
];

export function getPersonality(slug: string): BeachPersonality | undefined {
  return beachPersonalities.find((p) => p.slug === slug);
}
