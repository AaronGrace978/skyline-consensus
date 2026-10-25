/**
 * Skyline Consensus — Greater Boston eVTOL Airspace & Environmental Justice Geodata
 *
 * Authentic geospatial coordinates for Boston vertiports, Environmental Justice (EJ)
 * neighborhoods, hospital quiet zones, FAA Logan Class B restricted approach corridors,
 * and low-impact blue/green acoustic flyways.
 */

const VERTIPORTS = [
  {
    id: 'BOS',
    code: 'BOS-V1',
    name: 'Logan International Vertiport',
    shortName: 'Logan Airport (BOS)',
    neighborhood: 'East Boston / Massport Hub',
    lat: 42.3645,
    lng: -71.0185,
    elevationFt: 20,
    airspaceClass: 'FAA Class B Surface',
    padCount: 6,
    maxHourlyOps: 36,
    description: 'Primary transatlantic & regional multimodal transfer hub on Logan Airport southwest apron.',
    operatorPriority: 'High-frequency airport shuttle & regional connector'
  },
  {
    id: 'LMA',
    code: 'LMA-MED',
    name: 'Longwood Medical & Academic Vertiport',
    shortName: 'Longwood Medical (LMA)',
    neighborhood: 'Longwood / Fenway Medical District',
    lat: 42.3378,
    lng: -71.1055,
    elevationFt: 65,
    airspaceClass: 'Class B Tier-1 Hospital Heli-Corridor',
    padCount: 3,
    maxHourlyOps: 18,
    description: 'Critical care, organ transport, and specialist shuttle hub serving Brigham, Children\'s, and Beth Israel.',
    operatorPriority: 'Time-critical medical logistics & clinical executive transfer'
  },
  {
    id: 'KSQ',
    code: 'KSQ-MIT',
    name: 'Kendall Square / MIT Innovation Vertiport',
    shortName: 'Kendall Sq / MIT (KSQ)',
    neighborhood: 'Kendall Square, Cambridge',
    lat: 42.3629,
    lng: -71.0839,
    elevationFt: 35,
    airspaceClass: 'Charles River Special Flight Rules Corridor',
    padCount: 4,
    maxHourlyOps: 24,
    description: 'Biotech & deep-tech R&D mobility hub adjacent to the Charles River Basin.',
    operatorPriority: 'Biotech lab-to-airport express & cross-river commuter link'
  },
  {
    id: 'SBP',
    code: 'SBP-WFT',
    name: 'Seaport Innovation Waterfront Vertiport',
    shortName: 'Seaport Waterfront (SBP)',
    neighborhood: 'South Boston Waterfront / BCEC',
    lat: 42.3502,
    lng: -71.0388,
    elevationFt: 18,
    airspaceClass: 'FAA Class B Inner Harbor Sector',
    padCount: 5,
    maxHourlyOps: 30,
    description: 'Waterfront barge-mounted vertiport serving the Seaport District and Convention Center.',
    operatorPriority: 'High-demand business commuter & harbor hop hub'
  },
  {
    id: 'BBY',
    code: 'BBY-SST',
    name: 'Back Bay / South Station Rail-Air Nexus',
    shortName: 'South Station / Back Bay (BBY)',
    neighborhood: 'Fort Point / Dewey Square',
    lat: 42.3519,
    lng: -71.0552,
    elevationFt: 45,
    airspaceClass: 'Downtown High-Rise Controlled Sector',
    padCount: 4,
    maxHourlyOps: 22,
    description: 'Elevated deck over I-93 / Northeast Corridor rail terminal connecting commuter rail to eVTOL.',
    operatorPriority: 'Intermodal rail-to-air regional transfer hub'
  },
  {
    id: 'MHT',
    code: 'MHT-MYS',
    name: 'Mystic River / Assembly Regional Vertiport',
    shortName: 'Mystic / Assembly Hub (MHT)',
    neighborhood: 'Somerville / Medford Mystic Waterfront',
    lat: 42.3955,
    lng: -71.0785,
    elevationFt: 22,
    airspaceClass: 'Mystic River North Gateway',
    padCount: 4,
    maxHourlyOps: 24,
    description: 'Northern metro gateway positioned along the I-93 & Mystic River industrial channel.',
    operatorPriority: 'North Shore & I-93 suburban congestion bypass'
  }
];

/**
 * Boston Sensitive Neighborhoods & Environmental Justice (EJ) Zones
 * Based on Massachusetts Environmental Justice census block criteria
 * (Minority population, median household income, English language isolation)
 * and municipal hospital/school quiet zone ordinances.
 */
const SENSITIVE_ZONES = [
  {
    id: 'east-boston-ej',
    name: 'East Boston (Jeffries Point & Eagle Hill)',
    category: 'Environmental Justice & High Baseline Aviation Burden',
    isEnvironmentalJustice: true,
    ejCriteria: ['Minority', 'Income', 'Language Isolation', 'Historic Airport Noise Burden'],
    population: 47200,
    populationDensityPerSqKm: 10850,
    dayNoiseCapDba: 55.0,
    nightNoiseCapDba: 48.0,
    ambientNoiseDba: 61.0,
    equityWeight: 1.55,
    minSafeAltitudeFt: 1350,
    center: { lat: 42.3732, lng: -71.0335 },
    radiusMeters: 1150,
    polygon: [
      [42.3820, -71.0415],
      [42.3835, -71.0240],
      [42.3610, -71.0265],
      [42.3572, -71.0385],
      [42.3710, -71.0445]
    ],
    color: '#f43f5e',
    description: 'Historically overburdened by Logan Airport jet operations; strict cumulative acoustic cap enforced by Community Agent.'
  },
  {
    id: 'south-end-medical-ej',
    name: 'South End & Boston Medical Center Quiet Zone',
    category: 'Hospital Critical Quiet Zone + Environmental Justice Tract',
    isEnvironmentalJustice: true,
    ejCriteria: ['Minority', 'Income', 'Level-1 Trauma Hospital Acoustic Zone'],
    population: 35800,
    populationDensityPerSqKm: 13400,
    dayNoiseCapDba: 53.5,
    nightNoiseCapDba: 46.5,
    ambientNoiseDba: 56.0,
    equityWeight: 1.50,
    minSafeAltitudeFt: 1400,
    center: { lat: 42.3395, lng: -71.0735 },
    radiusMeters: 1050,
    polygon: [
      [42.3458, -71.0825],
      [42.3462, -71.0645],
      [42.3335, -71.0650],
      [42.3328, -71.0815]
    ],
    color: '#ef4444',
    description: 'Dense residential brownstones, Villa Victoria EJ housing, and Boston Medical Center inpatient recovery wards.'
  },
  {
    id: 'roxbury-nubian-ej',
    name: 'Roxbury / Nubian Square & Lower Roxbury',
    category: 'Environmental Justice Priority Community',
    isEnvironmentalJustice: true,
    ejCriteria: ['Minority', 'Income', 'Youth School Density'],
    population: 54100,
    populationDensityPerSqKm: 9800,
    dayNoiseCapDba: 54.0,
    nightNoiseCapDba: 47.0,
    ambientNoiseDba: 55.0,
    equityWeight: 1.50,
    minSafeAltitudeFt: 1350,
    center: { lat: 42.3295, lng: -71.0885 },
    radiusMeters: 1100,
    polygon: [
      [42.3360, -71.0975],
      [42.3355, -71.0790],
      [42.3220, -71.0795],
      [42.3225, -71.0985]
    ],
    color: '#f43f5e',
    description: 'Core EJ neighborhood with 14 K-12 schools and community health centers; protected against low-altitude commuter cut-throughs.'
  },
  {
    id: 'chinatown-leather-ej',
    name: 'Chinatown / Tufts Medical / Bay Village',
    category: 'High-Density Environmental Justice & Pediatric Medical Zone',
    isEnvironmentalJustice: true,
    ejCriteria: ['Minority', 'Income', 'Language Isolation', 'Tufts Medical Center'],
    population: 21400,
    populationDensityPerSqKm: 18900,
    dayNoiseCapDba: 54.5,
    nightNoiseCapDba: 47.5,
    ambientNoiseDba: 59.0,
    equityWeight: 1.60,
    minSafeAltitudeFt: 1400,
    center: { lat: 42.3501, lng: -71.0624 },
    radiusMeters: 680,
    polygon: [
      [42.3542, -71.0680],
      [42.3545, -71.0575],
      [42.3465, -71.0578],
      [42.3462, -71.0678]
    ],
    color: '#e11d48',
    description: 'Highest residential density & cumulative highway/air pollution burden in New England; strict acoustic & overflight shield.'
  },
  {
    id: 'beacon-hill-back-bay',
    name: 'Beacon Hill & Historic Back Bay Residential',
    category: 'High-Density Historic Residential & Public Garden',
    isEnvironmentalJustice: false,
    ejCriteria: ['High Population Density', 'Historic District Preservation'],
    population: 41200,
    populationDensityPerSqKm: 14200,
    dayNoiseCapDba: 56.5,
    nightNoiseCapDba: 49.5,
    ambientNoiseDba: 55.5,
    equityWeight: 1.15,
    minSafeAltitudeFt: 1250,
    center: { lat: 42.3548, lng: -71.0745 },
    radiusMeters: 980,
    polygon: [
      [42.3602, -71.0845],
      [42.3608, -71.0650],
      [42.3490, -71.0665],
      [42.3485, -71.0850]
    ],
    color: '#fb923c',
    description: 'Dense residential blocks between Charles River and Boylston Street; sensitive to low-altitude rotor blade vortex interaction (BVI) noise.'
  },
  {
    id: 'north-end-waterfront',
    name: 'North End & West End Residential',
    category: 'Dense Residential & MGH Hospital Campus',
    isEnvironmentalJustice: false,
    ejCriteria: ['Mass General Hospital Campus', 'Dense Residential'],
    population: 28900,
    populationDensityPerSqKm: 15600,
    dayNoiseCapDba: 56.0,
    nightNoiseCapDba: 48.5,
    ambientNoiseDba: 57.0,
    equityWeight: 1.25,
    minSafeAltitudeFt: 1300,
    center: { lat: 42.3648, lng: -71.0568 },
    radiusMeters: 820,
    polygon: [
      [42.3695, -71.0665],
      [42.3702, -71.0502],
      [42.3608, -71.0508],
      [42.3605, -71.0660]
    ],
    color: '#f97316',
    description: 'Includes Massachusetts General Hospital (MGH) trauma center and narrow residential streets.'
  },
  {
    id: 'cambridgeport-riverside',
    name: 'Cambridgeport & Fenway Residential Corridor',
    category: 'Residential & EJ Mixed Community',
    isEnvironmentalJustice: true,
    ejCriteria: ['Minority', 'Dense Multi-Family Housing', 'Schools & Dorms'],
    population: 38400,
    populationDensityPerSqKm: 12400,
    dayNoiseCapDba: 55.0,
    nightNoiseCapDba: 48.5,
    ambientNoiseDba: 54.5,
    equityWeight: 1.40,
    minSafeAltitudeFt: 1300,
    center: { lat: 42.3545, lng: -71.0945 },
    radiusMeters: 950,
    polygon: [
      [42.3625, -71.1045],
      [42.3620, -71.0880],
      [42.3455, -71.0890],
      [42.3452, -71.1035]
    ],
    color: '#f43f5e',
    description: 'Dense Cambridgeport and Fenway residential blocks; protected from low-altitude direct cross-river cut-throughs.'
  },
  {
    id: 'charlestown-bunker-hill',
    name: 'Charlestown & Bunker Hill Housing Community',
    category: 'Environmental Justice Public Housing & Schools Zone',
    isEnvironmentalJustice: true,
    ejCriteria: ['Income', 'Bunker Hill Public Housing Redevelopment', 'K-8 Schools'],
    population: 20600,
    populationDensityPerSqKm: 8900,
    dayNoiseCapDba: 55.5,
    nightNoiseCapDba: 48.5,
    ambientNoiseDba: 56.0,
    equityWeight: 1.40,
    minSafeAltitudeFt: 1300,
    center: { lat: 42.3782, lng: -71.0622 },
    radiusMeters: 920,
    polygon: [
      [42.3845, -71.0710],
      [42.3848, -71.0535],
      [42.3720, -71.0540],
      [42.3718, -71.0705]
    ],
    color: '#f43f5e',
    description: 'Historic Charlestown residential hillside and Bunker Hill family housing.'
  }
];

/**
 * Regulatory & Safety Restricted Airspace Zones (Enforced by City Agent)
 */
const RESTRICTED_ZONES = [
  {
    id: 'logan-runway-22l-approach',
    name: 'FAA Logan Rwy 22L/22R Active Approach & Departure Cone',
    authority: 'FAA Boston TRACON (Class B)',
    hazardType: 'Heavy Wake Turbulence & Commercial Jet Conflict',
    severity: 'HARD_EXCLUSION',
    maxAllowedAltitudeFt: 400,
    requiredClearanceMeters: 450,
    center: { lat: 42.3575, lng: -71.0325 },
    radiusMeters: 520,
    polygon: [
      [42.3618, -71.0375],
      [42.3620, -71.0275],
      [42.3532, -71.0280],
      [42.3530, -71.0378]
    ],
    color: '#eab308',
    description: 'Active commercial jet final approach/departure surface; eVTOLs must route via approved Southern Harbor Gate or North Channel.'
  },
  {
    id: 'financial-district-highrise-core',
    name: 'Downtown Financial District High-Rise Wake & Obstacle Core',
    authority: 'Boston Airspace Safety & BPDA Obstacle Clearance',
    hazardType: '700ft+ Skyscraper Mechanical Wind Shear & Zero Emergency Landing Area',
    severity: 'REGULATORY_RESTRICTION',
    minSafeAltitudeFt: 1650,
    requiredClearanceMeters: 520,
    center: { lat: 42.3568, lng: -71.0562 },
    radiusMeters: 620,
    polygon: [
      [42.3605, -71.0615],
      [42.3608, -71.0510],
      [42.3530, -71.0512],
      [42.3528, -71.0612]
    ],
    color: '#f59e0b',
    description: 'High-rise canyon creating severe urban canyon wind-shear; City Agent prohibits low-level transit without autorotation water reachability.'
  }
];

/**
 * Low-Impact Blue/Green & Highway Acoustic Masking Flyway Corridors
 * Used by Community & City Agents to construct Pareto-optimal negotiated flight paths.
 */
const FLYWAY_CORRIDORS = [
  {
    id: 'boston-inner-harbor',
    name: 'Boston Inner Harbor & Main Ship Channel Flyway',
    type: 'BLUE_WATER_CORRIDOR',
    acousticMaskingBonusDba: 8.5,
    safetyAutorotationBonus: 18,
    waypoints: [
      { lat: 42.3645, lng: -71.0185, name: 'Logan SW Water Gate' },
      { lat: 42.3485, lng: -71.0255, name: 'South Harbor FAA Gate' },
      { lat: 42.3502, lng: -71.0388, name: 'Seaport Harbor Channel' },
      { lat: 42.3645, lng: -71.0495, name: 'Charlestown Navy Yard Channel' },
      { lat: 42.3705, lng: -71.0560, name: 'Charles River Locks Entry' }
    ],
    color: '#06b6d4',
    description: 'Over-water corridor providing zero residential overflight and continuous emergency ditching safety.'
  },
  {
    id: 'charles-river-basin',
    name: 'Charles River Basin Low-Impact Flyway',
    type: 'BLUE_WATER_CORRIDOR',
    acousticMaskingBonusDba: 7.5,
    safetyAutorotationBonus: 16,
    waypoints: [
      { lat: 42.3688, lng: -71.0605, name: 'Zakim / Science Park Basin' },
      { lat: 42.3615, lng: -71.0725, name: 'Longfellow Bridge Centerline' },
      { lat: 42.3555, lng: -71.0845, name: 'Harvard Bridge / MIT Basin' },
      { lat: 42.3472, lng: -71.0845, name: 'Charlesgate / Muddy River Confluence' },
      { lat: 42.3378, lng: -71.1055, name: 'Emerald Necklace Medical Link' }
    ],
    color: '#0ea5e9',
    description: 'Primary east-west water corridor separating Boston and Cambridge with 600m+ water buffer from residential facades.'
  },
  {
    id: 'mass-pike-i90-trench',
    name: 'I-90 Mass Pike / Rail Trench Acoustic Masking Corridor',
    type: 'HIGHWAY_MASKING_CORRIDOR',
    acousticMaskingBonusDba: 7.5,
    safetyAutorotationBonus: 12,
    waypoints: [
      { lat: 42.3485, lng: -71.0255, name: 'South Harbor / Haul Road Entry' },
      { lat: 42.3458, lng: -71.0465, name: 'Seaport Haul Road / I-90 Portal' },
      { lat: 42.3468, lng: -71.0595, name: 'I-93 / I-90 Interchange Trench' },
      { lat: 42.3472, lng: -71.0785, name: 'Copley / Mass Pike Rail Cut' },
      { lat: 42.3465, lng: -71.0965, name: 'Kenmore / Lansdowne Rail Trench' },
      { lat: 42.3378, lng: -71.1055, name: 'Longwood Rail Spur Approach' }
    ],
    color: '#38bdf8',
    description: 'Follows depressed I-90 highway and CSX/MBTA rail right-of-way where 70+ dBA highway traffic masks eVTOL acoustic signature.'
  },
  {
    id: 'mystic-i93-north-channel',
    name: 'Mystic River & I-93 Industrial Corridor',
    type: 'INDUSTRIAL_WATER_CORRIDOR',
    acousticMaskingBonusDba: 7.0,
    safetyAutorotationBonus: 14,
    waypoints: [
      { lat: 42.3925, lng: -71.0745, name: 'Mystic River Drawbridge' },
      { lat: 42.3845, lng: -71.0615, name: 'Alford St / Mystic Channel' },
      { lat: 42.3795, lng: -71.0455, name: 'Tobin Bridge South Span Water' },
      { lat: 42.3690, lng: -71.0435, name: 'Inner Harbor Confluence' }
    ],
    color: '#22d3ee',
    description: 'Industrial shipping channel and elevated I-93 corridor shielding Charlestown and East Somerville neighborhoods.'
  }
];

/**
 * Curated Boston Mission Scenarios for Demo & Evaluation
 */
const MISSION_SCENARIOS = [
  {
    id: 'bos-lma-medical',
    title: 'Logan (BOS) → Longwood Medical (LMA)',
    subtitle: 'Transplant & Commuter Corridor Across South End & Roxbury EJ Tracts',
    originId: 'BOS',
    destinationId: 'LMA',
    timeOfDay: 'day',
    weather: 'clear',
    missionType: 'medical_commuter',
    aircraftModel: 'Joby S4 / 6-Rotor Tilt-Prop',
    defaultWeights: { community: 0.38, operator: 0.30, city: 0.32 },
    conflictSummary: 'Direct geodesic path cuts through FAA Runway 22L approach cone, Financial District skyscrapers, Chinatown EJ tract, and South End / Boston Medical Center quiet zone.',
    consensusSummary: 'Routes via Southern Harbor Gate → Fort Point Channel → I-90 Mass Pike / Rail Trench acoustic masking corridor at 1,450 ft before descending into Longwood via Muddy River.'
  },
  {
    id: 'sbp-ksq-shuttle',
    title: 'Seaport (SBP) → Kendall Square / MIT (KSQ)',
    subtitle: 'High-Frequency Innovation District Shuttle',
    originId: 'SBP',
    destinationId: 'KSQ',
    timeOfDay: 'day',
    weather: 'clear',
    missionType: 'passenger_shuttle',
    aircraftModel: 'Archer Midnight / 12-Prop eVTOL',
    defaultWeights: { community: 0.35, operator: 0.35, city: 0.30 },
    conflictSummary: 'Direct line slices directly over Downtown Financial District towers and dense Beacon Hill / Back Bay historic residential blocks.',
    consensusSummary: 'Follows Inner Harbor around North End waterfront into the Charles River Locks and cruises over the Charles River Basin centerline to Kendall Square.'
  },
  {
    id: 'bos-bby-night-curfew',
    title: 'Logan (BOS) → South Station / Back Bay (BBY) [Night Curfew]',
    subtitle: '22:45 EDT Night Operations Under Strict 48 dBA Residential Ceiling',
    originId: 'BOS',
    destinationId: 'BBY',
    timeOfDay: 'night',
    weather: 'clear',
    missionType: 'night_passenger',
    aircraftModel: 'Joby S4 Low-RPM Quiet Cruise Mode',
    defaultWeights: { community: 0.45, operator: 0.25, city: 0.30 },
    conflictSummary: 'Nighttime acoustic caps drop by 7 dBA across East Boston, North End, and Chinatown; standard harbour hop still triggers shoreline acoustic violations.',
    consensusSummary: 'Executes deep Outer Harbor water dogleg with low-RPM 1,550 ft quiet approach up Fort Point Channel directly to the I-93 rail deck.'
  },
  {
    id: 'mht-sbp-windy',
    title: 'Mystic / Assembly (MHT) → Seaport (SBP) [24kt NW Crosswinds]',
    subtitle: 'North-South Regional Link with Charlestown EJ Protection & Wind Shear',
    originId: 'MHT',
    destinationId: 'SBP',
    timeOfDay: 'day',
    weather: 'windy',
    missionType: 'regional_commuter',
    aircraftModel: 'Archer Midnight Heavy-Weather Config',
    defaultWeights: { community: 0.34, operator: 0.30, city: 0.36 },
    conflictSummary: 'Direct path crosses directly over Charlestown Bunker Hill EJ public housing and North End residential blocks during 24 kt gusty wind shear.',
    consensusSummary: 'Follows Mystic River industrial channel east of Tobin Bridge and tracks main harbor ship channel south to Seaport.'
  },
  {
    id: 'ksq-lma-river',
    title: 'Kendall Sq / MIT (KSQ) → Longwood Medical (LMA)',
    subtitle: 'Cambridgeport EJ Shield & Charles River Bend Trajectory',
    originId: 'KSQ',
    destinationId: 'LMA',
    timeOfDay: 'evening',
    weather: 'clear',
    missionType: 'biotech_medical',
    aircraftModel: 'Joby S4 / 6-Rotor Tilt-Prop',
    defaultWeights: { community: 0.40, operator: 0.32, city: 0.28 },
    conflictSummary: 'Straight line cuts across dense Cambridgeport residential blocks and residential Fenway.',
    consensusSummary: 'Tracks Charles River Basin centerline around MIT/BU Bridge bend before turning south along the Muddy River greenway corridor.'
  }
];

module.exports = {
  VERTIPORTS,
  SENSITIVE_ZONES,
  RESTRICTED_ZONES,
  FLYWAY_CORRIDORS,
  MISSION_SCENARIOS
};
