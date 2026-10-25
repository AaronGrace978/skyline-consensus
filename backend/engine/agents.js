/**
 * Skyline Consensus — Multi-Agent Decision & Trajectory Generation Engine
 *
 * Implements the three negotiating agents:
 * 1. CommunityAgent (Neighborhood Noise, Health & Environmental Justice Advocate)
 * 2. OperatorAgent  (eVTOL Airline Fleet Efficiency, Energy & Schedule Optimizer)
 * 3. CityAgent      (Boston Airspace Safety, FAA Class B & Municipal Infrastructure Regulator)
 */

const { haversineMeters } = require('./acousticsAndPhysics');

const AGENT_PROFILES = {
  COMMUNITY: {
    id: 'COMMUNITY',
    name: 'Community Equity & Acoustic Agent',
    shortName: 'Community Agent',
    role: 'Boston Neighborhoods & Environmental Justice Advocate',
    organization: 'Greater Boston EJ Airspace Coalition & Civic Noise Watch',
    color: '#10b981',
    badge: 'NOISE + EQUITY',
    mandate:
      'Enforce neighborhood dBA ceilings, eliminate disproportionate overflight of Environmental Justice (EJ) census tracts, and maximize Jain’s inter-neighborhood fairness index.',
    disagreementPoint: 25
  },
  OPERATOR: {
    id: 'OPERATOR',
    name: 'eVTOL Fleet Operator Agent',
    shortName: 'Operator Agent',
    role: 'Airline Flight Efficiency, Energy & Schedule Optimizer',
    organization: 'New England Urban Air Mobility Fleet Ops',
    color: '#3b82f6',
    badge: 'EFFICIENCY + ENERGY',
    mandate:
      'Minimize flight duration, battery kWh draw, climb energy penalty, and route detour ratio while maintaining FAA 30% battery reserve and commercial turnaround viability.',
    disagreementPoint: 30
  },
  CITY: {
    id: 'CITY',
    name: 'City of Boston & FAA Regulatory Agent',
    shortName: 'City Agent',
    role: 'Municipal Safety, FAA Class B Separation & Vertiport Regulator',
    organization: 'Boston Office of Emerging Mobility & FAA TRACON Liaison',
    color: '#f59e0b',
    badge: 'SAFETY + REGULATORY',
    mandate:
      'Enforce zero-incursion separation from Logan Class B jet corridors, urban skyscraper wind-shear buffers, hospital trauma helipad clearance, and autorotation water/highway reachability.',
    disagreementPoint: 28
  }
};

/**
 * Compute all three agents' utility scores (0 - 100) and detailed evaluation diagnostics
 * for a given trajectory evaluation result.
 */
function scoreAllAgents(evaluation, context = {}) {
  const weather = context.weather || 'clear';
  const timeOfDay = context.timeOfDay || 'day';

  // 1. COMMUNITY AGENT UTILITY (0 - 100)
  const violatedZones = evaluation.zoneImpacts.filter((z) => z.violated);
  const ejViolations = violatedZones.filter((z) => z.isEnvironmentalJustice);

  let acousticViolationPenalty = 0;
  for (const z of evaluation.zoneImpacts) {
    if (z.exceedanceDba > 0) {
      acousticViolationPenalty += z.exceedanceDba * 5.5 * z.equityWeight;
    }
    if (z.samplesDirectlyOver >= 2 && z.lowestAltitudeOverZoneFt < z.minSafeAltitudeFt) {
      const altDeficitHundreds = (z.minSafeAltitudeFt - z.lowestAltitudeOverZoneFt) / 100;
      acousticViolationPenalty += altDeficitHundreds * 4.2 * z.equityWeight;
    }
  }

  const peakNoiseThreshold = timeOfDay === 'night' ? 48.5 : 53.5;
  const peakNoisePenalty = Math.max(0, (evaluation.peakGroundDba - peakNoiseThreshold) * 2.2);
  const fairnessBonus = (evaluation.jainsFairnessIndex - 0.90) * 80;
  const flywayBonus = (evaluation.flywayAlignmentPct / 100) * 9.5;

  const rawCommunityUtility =
    88 - acousticViolationPenalty - peakNoisePenalty + fairnessBonus + flywayBonus;
  const communityUtility = Math.round(Math.max(12, Math.min(98, rawCommunityUtility)));

  // 2. OPERATOR AGENT UTILITY (0 - 100)
  const detourExcess = Math.max(0, evaluation.detourRatio - 1.0);
  const detourPenalty = detourExcess * 32; // e.g., 1.25x detour -> -8 pts
  const altitudeEnergyPenalty = Math.max(0, (evaluation.maxAltitudeFt - 800) / 100) * 1.15;
  const speedEfficiencyPenalty = Math.max(0, (125 - evaluation.avgCruiseSpeedKt) * 0.45);

  const rawOperatorUtility =
    97 - detourPenalty - altitudeEnergyPenalty - speedEfficiencyPenalty;
  const operatorUtility = Math.round(Math.max(25, Math.min(98, rawOperatorUtility)));

  // 3. CITY AGENT UTILITY (0 - 100)
  const hardViolationPenalty = evaluation.airspaceViolationsCount * 42;
  let proximitySafetyPenalty = 0;
  for (const rStat of evaluation.restrictedStatus) {
    if (!rStat.violated && rStat.minDistanceMeters < 260) {
      proximitySafetyPenalty += ((260 - rStat.minDistanceMeters) / 100) * 5.5;
    }
  }
  const lowUrbanTransitPenalty = evaluation.maxAltitudeFt < 1000 ? 22 : 0;
  const hospitalZonesViolated = violatedZones.filter(
    (z) => z.zoneId.includes('medical') || z.zoneId.includes('chinatown') || z.zoneId.includes('north-end')
  ).length;
  const hospitalPenalty = hospitalZonesViolated * 14;
  const weatherSafetyPenalty =
    weather === 'windy' && evaluation.flywayAlignmentPct < 50 ? 14 : 0;
  const autorotationBonus = (evaluation.flywayAlignmentPct / 100) * 11.0;

  const rawCityUtility =
    88 -
    hardViolationPenalty -
    proximitySafetyPenalty -
    lowUrbanTransitPenalty -
    hospitalPenalty -
    weatherSafetyPenalty +
    autorotationBonus;
  const cityUtility = Math.round(Math.max(14, Math.min(98, rawCityUtility)));

  // Compute Weighted Nash Bargaining Score & Skyline Consensus Score
  const weights = context.weights || { community: 0.36, operator: 0.32, city: 0.32 };
  const wSum = (weights.community || 0.33) + (weights.operator || 0.33) + (weights.city || 0.34);
  const wC = (weights.community || 0.33) / wSum;
  const wO = (weights.operator || 0.33) / wSum;
  const wM = (weights.city || 0.34) / wSum;

  const weightedMean = wC * communityUtility + wO * operatorUtility + wM * cityUtility;

  const minAgentUtility = Math.min(communityUtility, operatorUtility, cityUtility);
  const maxAgentUtility = Math.max(communityUtility, operatorUtility, cityUtility);
  const spreadPenalty = Math.max(0, (maxAgentUtility - minAgentUtility) * 0.22);

  const vetoPenalty =
    evaluation.airspaceViolationsCount * 18 + Math.min(24, ejViolations.length * 9);

  const equilibriumBonus =
    evaluation.airspaceViolationsCount === 0 && ejViolations.length === 0 && minAgentUtility >= 75
      ? 6
      : 0;

  const consensusScore = Math.round(
    Math.max(14, Math.min(98, weightedMean - spreadPenalty - vetoPenalty + equilibriumBonus))
  );

  // Nash Product normalized
  const dC = AGENT_PROFILES.COMMUNITY.disagreementPoint;
  const dO = AGENT_PROFILES.OPERATOR.disagreementPoint;
  const dM = AGENT_PROFILES.CITY.disagreementPoint;
  const nashTermC = Math.max(1, communityUtility - dC);
  const nashTermO = Math.max(1, operatorUtility - dO);
  const nashTermM = Math.max(1, cityUtility - dM);
  const nashBargainingIndex = Number(
    (Math.pow(nashTermC, wC) * Math.pow(nashTermO, wO) * Math.pow(nashTermM, wM)).toFixed(1)
  );

  const consensusReached =
    evaluation.airspaceViolationsCount === 0 &&
    ejViolations.length === 0 &&
    minAgentUtility >= 72;

  return {
    communityUtility,
    operatorUtility,
    cityUtility,
    consensusScore,
    nashBargainingIndex,
    consensusReached,
    violatedZonesCount: violatedZones.length,
    ejViolationsCount: ejViolations.length,
    violatedZones,
    ejViolations,
    weights: {
      community: Number(wC.toFixed(2)),
      operator: Number(wO.toFixed(2)),
      city: Number(wM.toFixed(2))
    }
  };
}

/**
 * Deflect intermediate waypoints away from any user-placed Custom Dynamic Quiet Zones
 */
function applyDynamicZoneAvoidance(waypoints, customZones = [], targetAltitudeFt = 1480) {
  if (!customZones || customZones.length === 0) return waypoints;

  let currentWps = waypoints.map((wp) => ({ ...wp }));

  for (const cz of customZones) {
    const zoneCenter = { lat: Number(cz.lat), lng: Number(cz.lng) };
    const clearRadiusM = (cz.radiusMeters || 620) + 420;
    const refined = [currentWps[0]];

    for (let i = 0; i < currentWps.length - 1; i++) {
      const a = currentWps[i];
      const b = currentWps[i + 1];

      const checkPoints = [0.25, 0.5, 0.75].map((t) => ({
        t,
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
        altFt: (a.altFt + b.altFt) / 2
      }));

      let closestPt = null;
      let minDist = Infinity;
      for (const cp of checkPoints) {
        const d = haversineMeters(cp, zoneCenter);
        if (d < minDist) {
          minDist = d;
          closestPt = cp;
        }
      }

      if (minDist < clearRadiusM && closestPt) {
        const dLat = closestPt.lat - zoneCenter.lat;
        const dLng = closestPt.lng - zoneCenter.lng;
        const norm = Math.sqrt(dLat * dLat + dLng * dLng);

        let unitLat = 0;
        let unitLng = 0;
        if (norm > 1e-5) {
          unitLat = dLat / norm;
          unitLng = dLng / norm;
        } else {
          const segLat = b.lat - a.lat;
          const segLng = b.lng - a.lng;
          const segNorm = Math.sqrt(segLat * segLat + segLng * segLng) || 1;
          unitLat = -segLng / segNorm;
          unitLng = segLat / segNorm;
        }

        const pushDeg = (clearRadiusM - minDist + 320) / 111000;
        refined.push({
          lat: Number((zoneCenter.lat + unitLat * (clearRadiusM / 111000 + pushDeg * 0.45)).toFixed(5)),
          lng: Number((zoneCenter.lng + unitLng * (clearRadiusM / 82000 + pushDeg * 0.45)).toFixed(5)),
          altFt: Math.max(targetAltitudeFt, (cz.minSafeAltitudeFt || 1480) + 120),
          speedKt: 118,
          name: `${cz.name || 'Dynamic Quiet Zone'} Bypass Gate`
        });
      }

      if (i + 1 < currentWps.length - 1) {
        const dEnd = haversineMeters(b, zoneCenter);
        if (dEnd < clearRadiusM) {
          const vLat = b.lat - zoneCenter.lat;
          const vLng = b.lng - zoneCenter.lng;
          const vNorm = Math.sqrt(vLat * vLat + vLng * vLng) || 1e-4;
          const targetLatDeg = clearRadiusM / 111000;
          const targetLngDeg = clearRadiusM / 82000;
          b.lat = Number((zoneCenter.lat + (vLat / vNorm) * targetLatDeg).toFixed(5));
          b.lng = Number((zoneCenter.lng + (vLng / vNorm) * targetLngDeg).toFixed(5));
          b.altFt = Math.max(b.altFt, targetAltitudeFt + 120);
        }
      }

      refined.push(b);
    }

    currentWps = refined;
  }

  return currentWps;
}

/**
 * Curated & Geometric Multi-Stage Route Templates for Boston Origin-Destination Pairs
 */
function buildCandidateRoutes(origin, destination, context = {}) {
  const pairKey = `${origin.id}->${destination.id}`;
  const reverseKey = `${destination.id}->${origin.id}`;
  const timeOfDay = context.timeOfDay || 'day';
  const weights = context.weights || { community: 0.36, operator: 0.32, city: 0.32 };
  const customZones = context.customZones || [];

  const nightAltBoost = timeOfDay === 'night' ? 240 : 0;
  const communityBias = (weights.community || 0.35) - (weights.operator || 0.35);
  const consensusAltBoost = Math.round(communityBias * 180) + nightAltBoost;

  // ROUND 1: OPERATOR DIRECT GEODESIC ROUTE (Low-altitude 680-740 ft energy-minimal straight line)
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const q1Lat = origin.lat * 0.67 + destination.lat * 0.33;
  const q1Lng = origin.lng * 0.67 + destination.lng * 0.33;
  const q3Lat = origin.lat * 0.33 + destination.lat * 0.67;
  const q3Lng = origin.lng * 0.33 + destination.lng * 0.67;

  const operatorDirectWaypoints = [
    { lat: origin.lat, lng: origin.lng, altFt: 250, speedKt: 65, name: `${origin.shortName} Departure Pad` },
    { lat: Number(q1Lat.toFixed(5)), lng: Number(q1Lng.toFixed(5)), altFt: 680, speedKt: 138, name: 'Direct Low-Climb Segment' },
    { lat: Number(midLat.toFixed(5)), lng: Number(midLng.toFixed(5)), altFt: 720, speedKt: 142, name: 'Geodesic Direct Midpoint' },
    { lat: Number(q3Lat.toFixed(5)), lng: Number(q3Lng.toFixed(5)), altFt: 660, speedKt: 132, name: 'Direct Descent Segment' },
    { lat: destination.lat, lng: destination.lng, altFt: 220, speedKt: 55, name: `${destination.shortName} Arrival Pad` }
  ];

  let cityWaypoints;
  let communityWaypoints;
  let consensusBaseWaypoints;

  const corridorPresets = {
    'BOS->LMA': {
      city: [
        { lat: origin.lat, lng: origin.lng, altFt: 260, speedKt: 65, name: 'BOS Pad Departure' },
        { lat: 42.3485, lng: -71.0255, altFt: 1120, speedKt: 128, name: 'FAA South Harbor Gate (Clears Rwy 22L)' },
        { lat: 42.3465, lng: -71.0520, altFt: 1140, speedKt: 130, name: 'Fort Point Channel Gate' },
        { lat: 42.3415, lng: -71.0745, altFt: 1080, speedKt: 126, name: 'South End Axial Transit' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 55, name: 'LMA Medical Pad Arrival' }
      ],
      community: [
        { lat: origin.lat, lng: origin.lng, altFt: 300, speedKt: 60, name: 'BOS Quiet Climb Departure' },
        { lat: 42.3485, lng: -71.0255, altFt: 1540 + nightAltBoost, speedKt: 112, name: 'South Harbor Acoustic Buffer' },
        { lat: 42.3458, lng: -71.0465, altFt: 1580 + nightAltBoost, speedKt: 112, name: 'Seaport Haul Road / I-90 Portal' },
        { lat: 42.3468, lng: -71.0595, altFt: 1580 + nightAltBoost, speedKt: 112, name: 'I-93 / I-90 Interchange Masking Trench' },
        { lat: 42.3472, lng: -71.0785, altFt: 1560 + nightAltBoost, speedKt: 112, name: 'Mass Pike Rail Cut (Bypasses South End & Chinatown EJ)' },
        { lat: 42.3465, lng: -71.0965, altFt: 1480 + nightAltBoost, speedKt: 108, name: 'Kenmore / Lansdowne Rail Trench' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'LMA Medical Pad Arrival' }
      ],
      consensus: [
        { lat: origin.lat, lng: origin.lng, altFt: 280, speedKt: 65, name: 'BOS Vertiport Departure' },
        { lat: 42.3485, lng: -71.0255, altFt: 1460 + consensusAltBoost, speedKt: 124, name: 'South Harbor FAA Gate' },
        { lat: 42.3458, lng: -71.0465, altFt: 1490 + consensusAltBoost, speedKt: 125, name: 'Seaport I-90 Trench Entry' },
        { lat: 42.3468, lng: -71.0595, altFt: 1500 + consensusAltBoost, speedKt: 124, name: 'I-90 / Rail Acoustic Masking Corridor' },
        { lat: 42.3472, lng: -71.0785, altFt: 1480 + consensusAltBoost, speedKt: 122, name: 'Copley Rail Cut (EJ Shield)' },
        { lat: 42.3465, lng: -71.0965, altFt: 1380 + consensusAltBoost, speedKt: 116, name: 'Kenmore / Muddy River Continuous Descent' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 52, name: 'LMA Medical Pad Arrival' }
      ]
    },
    'SBP->KSQ': {
      city: [
        { lat: origin.lat, lng: origin.lng, altFt: 250, speedKt: 65, name: 'Seaport Pad Departure' },
        { lat: 42.3645, lng: -71.0495, altFt: 1140, speedKt: 130, name: 'Inner Harbor Ship Channel (Clears High-Rise Core)' },
        { lat: 42.3648, lng: -71.0585, altFt: 1020, speedKt: 128, name: 'North End / West End Cut-Through' },
        { lat: 42.3625, lng: -71.0730, altFt: 1050, speedKt: 122, name: 'Lower Charles Basin' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 55, name: 'Kendall Sq Pad Arrival' }
      ],
      community: [
        { lat: origin.lat, lng: origin.lng, altFt: 280, speedKt: 62, name: 'Seaport Waterfront Climb' },
        { lat: 42.3645, lng: -71.0495, altFt: 1560 + nightAltBoost, speedKt: 112, name: 'Charlestown Navy Yard Channel' },
        { lat: 42.3705, lng: -71.0560, altFt: 1540 + nightAltBoost, speedKt: 112, name: 'Charles River Locks Entry (Clears North End)' },
        { lat: 42.3688, lng: -71.0605, altFt: 1500 + nightAltBoost, speedKt: 112, name: 'Zakim / Science Park Basin' },
        { lat: 42.3615, lng: -71.0725, altFt: 1440 + nightAltBoost, speedKt: 108, name: 'Longfellow Bridge River Centerline' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'Kendall Sq Pad Arrival' }
      ],
      consensus: [
        { lat: origin.lat, lng: origin.lng, altFt: 270, speedKt: 65, name: 'Seaport Pad Departure' },
        { lat: 42.3645, lng: -71.0495, altFt: 1480 + consensusAltBoost, speedKt: 124, name: 'Harbor Confluence Water Gate' },
        { lat: 42.3705, lng: -71.0560, altFt: 1460 + consensusAltBoost, speedKt: 122, name: 'Charles River Locks Gate' },
        { lat: 42.3688, lng: -71.0605, altFt: 1440 + consensusAltBoost, speedKt: 122, name: 'Science Park Basin Gate' },
        { lat: 42.3615, lng: -71.0725, altFt: 1380 + consensusAltBoost, speedKt: 118, name: 'Charles River Basin Centerline' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 52, name: 'Kendall Sq Pad Arrival' }
      ]
    },
    'BOS->BBY': {
      city: [
        { lat: origin.lat, lng: origin.lng, altFt: 250, speedKt: 65, name: 'BOS Pad Departure' },
        { lat: 42.3485, lng: -71.0255, altFt: 1120, speedKt: 126, name: 'FAA South Harbor Gate' },
        { lat: 42.3495, lng: -71.0485, altFt: 980, speedKt: 120, name: 'Fort Point Entry' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'South Station Rail Deck Arrival' }
      ],
      community: [
        { lat: origin.lat, lng: origin.lng, altFt: 300, speedKt: 60, name: 'BOS Night-Quiet Climb' },
        { lat: 42.3485, lng: -71.0255, altFt: 1620 + nightAltBoost, speedKt: 110, name: 'South Harbor Deep Acoustic Buffer' },
        { lat: 42.3458, lng: -71.0465, altFt: 1640 + nightAltBoost, speedKt: 110, name: 'Seaport Haul Road / I-90 Portal' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 48, name: 'South Station Rail Deck Arrival' }
      ],
      consensus: [
        { lat: origin.lat, lng: origin.lng, altFt: 290, speedKt: 62, name: 'BOS Vertiport Departure' },
        { lat: 42.3485, lng: -71.0255, altFt: 1520 + consensusAltBoost, speedKt: 120, name: 'South Harbor Quiet Gate' },
        { lat: 42.3458, lng: -71.0465, altFt: 1540 + consensusAltBoost, speedKt: 120, name: 'Seaport I-90 Masking Channel' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'South Station Rail Deck Arrival' }
      ]
    },
    'MHT->SBP': {
      city: [
        { lat: origin.lat, lng: origin.lng, altFt: 260, speedKt: 65, name: 'Mystic Hub Departure' },
        { lat: 42.3785, lng: -71.0605, altFt: 1120, speedKt: 126, name: 'Charlestown Ridge Crossing' },
        { lat: 42.3645, lng: -71.0465, altFt: 1140, speedKt: 126, name: 'Inner Harbor Confluence' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 55, name: 'Seaport Pad Arrival' }
      ],
      community: [
        { lat: origin.lat, lng: origin.lng, altFt: 290, speedKt: 60, name: 'Mystic Hub Quiet Climb' },
        { lat: 42.3925, lng: -71.0745, altFt: 1520 + nightAltBoost, speedKt: 112, name: 'Mystic River Drawbridge Channel' },
        { lat: 42.3845, lng: -71.0615, altFt: 1560 + nightAltBoost, speedKt: 112, name: 'Alford St / Mystic Industrial Channel' },
        { lat: 42.3795, lng: -71.0455, altFt: 1560 + nightAltBoost, speedKt: 114, name: 'Tobin Bridge Water Buffer (Shields Charlestown EJ)' },
        { lat: 42.3660, lng: -71.0455, altFt: 1500 + nightAltBoost, speedKt: 114, name: 'Main Ship Channel Centerline' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'Seaport Pad Arrival' }
      ],
      consensus: [
        { lat: origin.lat, lng: origin.lng, altFt: 280, speedKt: 64, name: 'Mystic Hub Departure' },
        { lat: 42.3845, lng: -71.0615, altFt: 1460 + consensusAltBoost, speedKt: 122, name: 'Mystic Industrial Corridor' },
        { lat: 42.3795, lng: -71.0455, altFt: 1480 + consensusAltBoost, speedKt: 124, name: 'Tobin Bridge Water Gate (Charlestown EJ Shield)' },
        { lat: 42.3660, lng: -71.0455, altFt: 1440 + consensusAltBoost, speedKt: 122, name: 'Inner Harbor Ship Channel' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 52, name: 'Seaport Pad Arrival' }
      ]
    },
    'KSQ->LMA': {
      city: [
        { lat: origin.lat, lng: origin.lng, altFt: 260, speedKt: 65, name: 'Kendall Sq Departure' },
        { lat: 42.3545, lng: -71.0895, altFt: 1080, speedKt: 126, name: 'Cambridgeport / River Crossing' },
        { lat: 42.3465, lng: -71.0965, altFt: 1060, speedKt: 120, name: 'Kenmore Transit Point' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 55, name: 'LMA Medical Pad Arrival' }
      ],
      community: [
        { lat: origin.lat, lng: origin.lng, altFt: 290, speedKt: 60, name: 'Kendall Sq River Climb' },
        { lat: 42.3555, lng: -71.0845, altFt: 1520 + nightAltBoost, speedKt: 112, name: 'Harvard Bridge River Centerline' },
        { lat: 42.3472, lng: -71.0845, altFt: 1540 + nightAltBoost, speedKt: 112, name: 'Charlesgate / Mass Pike Trench Entry (Shields Cambridgeport EJ)' },
        { lat: 42.3465, lng: -71.0965, altFt: 1480 + nightAltBoost, speedKt: 108, name: 'Kenmore / Lansdowne Rail Trench' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: 'LMA Medical Pad Arrival' }
      ],
      consensus: [
        { lat: origin.lat, lng: origin.lng, altFt: 280, speedKt: 64, name: 'Kendall Sq Departure' },
        { lat: 42.3555, lng: -71.0845, altFt: 1440 + consensusAltBoost, speedKt: 122, name: 'Charles River Basin Centerline' },
        { lat: 42.3472, lng: -71.0845, altFt: 1460 + consensusAltBoost, speedKt: 120, name: 'Charlesgate / I-90 Trench Gate' },
        { lat: 42.3465, lng: -71.0965, altFt: 1400 + consensusAltBoost, speedKt: 114, name: 'Muddy River / Rail Trench Descent' },
        { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 52, name: 'LMA Medical Pad Arrival' }
      ]
    }
  };

  if (corridorPresets[pairKey]) {
    cityWaypoints = corridorPresets[pairKey].city.map((wp) => ({ ...wp }));
    communityWaypoints = corridorPresets[pairKey].community.map((wp) => ({ ...wp }));
    consensusBaseWaypoints = corridorPresets[pairKey].consensus.map((wp) => ({ ...wp }));
  } else if (corridorPresets[reverseKey]) {
    const rev = corridorPresets[reverseKey];
    cityWaypoints = [...rev.city].reverse().map((wp, idx, arr) => ({
      ...wp,
      name:
        idx === 0
          ? `${origin.shortName} Departure`
          : idx === arr.length - 1
            ? `${destination.shortName} Arrival`
            : wp.name
    }));
    communityWaypoints = [...rev.community].reverse().map((wp, idx, arr) => ({
      ...wp,
      name:
        idx === 0
          ? `${origin.shortName} Departure`
          : idx === arr.length - 1
            ? `${destination.shortName} Arrival`
            : wp.name
    }));
    consensusBaseWaypoints = [...rev.consensus].reverse().map((wp, idx, arr) => ({
      ...wp,
      name:
        idx === 0
          ? `${origin.shortName} Departure`
          : idx === arr.length - 1
            ? `${destination.shortName} Arrival`
            : wp.name
    }));
  } else {
    const harborHub = { lat: 42.3645, lng: -71.0455, name: 'Inner Harbor Confluence Gate' };
    const charlesHub = { lat: 42.3615, lng: -71.0725, name: 'Charles River Basin Gate' };
    const pikeHub = { lat: 42.3468, lng: -71.0595, name: 'Mass Pike / I-93 Trench Gate' };

    const useSouthernCorridor = origin.lat + destination.lat < 84.71;
    const gateA = useSouthernCorridor ? pikeHub : harborHub;
    const gateB = destination.lng < -71.075 ? charlesHub : harborHub;

    cityWaypoints = [
      { lat: origin.lat, lng: origin.lng, altFt: 260, speedKt: 65, name: `${origin.shortName} Departure` },
      { lat: gateA.lat, lng: gateA.lng, altFt: 1140, speedKt: 128, name: gateA.name },
      { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 55, name: `${destination.shortName} Arrival` }
    ];

    communityWaypoints = [
      { lat: origin.lat, lng: origin.lng, altFt: 290, speedKt: 60, name: `${origin.shortName} Quiet Climb` },
      { lat: gateA.lat, lng: gateA.lng, altFt: 1540 + nightAltBoost, speedKt: 112, name: `${gateA.name} (EJ Shield)` },
      ...(haversineMeters(gateA, gateB) > 900
        ? [{ lat: gateB.lat, lng: gateB.lng, altFt: 1500 + nightAltBoost, speedKt: 112, name: gateB.name }]
        : []),
      { lat: destination.lat, lng: destination.lng, altFt: 240, speedKt: 50, name: `${destination.shortName} Arrival` }
    ];

    consensusBaseWaypoints = communityWaypoints.map((wp, idx, arr) => ({
      ...wp,
      altFt:
        idx === 0 || idx === arr.length - 1
          ? wp.altFt
          : Math.max(1420, wp.altFt - 60 + consensusAltBoost),
      speedKt: idx === 0 || idx === arr.length - 1 ? wp.speedKt : 122
    }));
  }

  const communityFinalWps = applyDynamicZoneAvoidance(
    communityWaypoints,
    customZones,
    1540 + nightAltBoost
  );
  const consensusFinalWps = applyDynamicZoneAvoidance(
    consensusBaseWaypoints,
    customZones,
    1460 + consensusAltBoost
  );

  return {
    round1_operatorDirect: {
      id: 'route-r1-operator',
      roundNumber: 1,
      name: 'Round 1: Operator Direct Geodesic Baseline',
      shortLabel: 'R1: Direct Baseline (Vetoed)',
      proposedBy: 'OPERATOR',
      color: '#ef4444',
      dashArray: '8, 8',
      quietRotorMode: false,
      waypoints: operatorDirectWaypoints
    },
    round2_cityRegulatory: {
      id: 'route-r2-city',
      roundNumber: 2,
      name: 'Round 2: City FAA & Obstacle Safe Corridor',
      shortLabel: 'R2: City Regulatory Route',
      proposedBy: 'CITY',
      color: '#f59e0b',
      dashArray: '6, 6',
      quietRotorMode: false,
      waypoints: cityWaypoints
    },
    round3_communityEquity: {
      id: 'route-r3-community',
      roundNumber: 3,
      name: 'Round 3: Community Maximum Equity & Quiet Route',
      shortLabel: 'R3: Community Equity Proposal',
      proposedBy: 'COMMUNITY',
      color: '#a855f7',
      dashArray: '4, 6',
      quietRotorMode: true,
      waypoints: communityFinalWps
    },
    round4_consensus: {
      id: 'route-r4-consensus',
      roundNumber: 4,
      name: 'Round 4: Skyline Consensus Route (Pareto-Nash Equilibrium)',
      shortLabel: 'R4: Skyline Consensus Path',
      proposedBy: 'CONSENSUS',
      color: '#10b981',
      dashArray: null,
      quietRotorMode: true,
      waypoints: consensusFinalWps
    }
  };
}

module.exports = {
  AGENT_PROFILES,
  scoreAllAgents,
  applyDynamicZoneAvoidance,
  buildCandidateRoutes
};
