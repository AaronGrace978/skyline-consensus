/**
 * Skyline Consensus — 3D Trajectory Physics, Acoustic Propagation & Equity Engine
 *
 * Implements:
 * 1. Haversine geodesic distance, point-to-segment distance & 3D trajectory discretization
 * 2. Spherical spreading + atmospheric absorption eVTOL acoustic model (LAeq dBA)
 *    with blade-vortex interaction (BVI) climb/descent adjustments and continuous
 *    blue/green water & highway corridor acoustic masking
 * 3. eVTOL battery energy consumption (kWh), flight time, and reserve margin calculation
 * 4. Neighborhood-by-neighborhood Environmental Justice (EJ) exposure, Jain's Fairness Index,
 *    and FAA Class B / obstacle safety compliance auditing
 */

const {
  SENSITIVE_ZONES,
  RESTRICTED_ZONES,
  FLYWAY_CORRIDORS
} = require('../data/bostonAirspace');

const EARTH_RADIUS_M = 6371000;
const FEET_TO_METERS = 0.3048;

/**
 * Compute Haversine horizontal distance in meters between two {lat, lng} points
 */
function haversineMeters(p1, p2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Shortest distance in meters from point P to line segment [A, B]
 */
function pointToSegmentMeters(p, a, b) {
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const px = p.lng * cosLat * 111320;
  const py = p.lat * 111320;
  const ax = a.lng * cosLat * 111320;
  const ay = a.lat * 111320;
  const bx = b.lng * cosLat * 111320;
  const by = b.lat * 111320;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Ray-casting point-in-polygon check for [lat, lng] polygon arrays
 */
function isPointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance from point to polygon boundary or center (returns 0 if inside polygon)
 */
function distanceToZoneMeters(point, zone) {
  if (zone.polygon && isPointInPolygon(point.lat, point.lng, zone.polygon)) {
    return 0;
  }
  if (zone.polygon && zone.polygon.length >= 3) {
    let minEdgeDist = Infinity;
    for (let i = 0; i < zone.polygon.length; i++) {
      const a = { lat: zone.polygon[i][0], lng: zone.polygon[i][1] };
      const b = {
        lat: zone.polygon[(i + 1) % zone.polygon.length][0],
        lng: zone.polygon[(i + 1) % zone.polygon.length][1]
      };
      const d = pointToSegmentMeters(point, a, b);
      if (d < minEdgeDist) minEdgeDist = d;
    }
    return minEdgeDist;
  }
  const centerDist = haversineMeters(point, zone.center);
  const radius = zone.radiusMeters || 650;
  return Math.max(0, centerDist - radius);
}

/**
 * Check if a point lies along a Blue/Green water channel or Highway Acoustic Masking Flyway
 */
function getFlywayMaskingBonus(point) {
  let bestBonus = 0;
  let activeCorridor = null;

  for (const corridor of FLYWAY_CORRIDORS) {
    for (let i = 0; i < corridor.waypoints.length - 1; i++) {
      const a = corridor.waypoints[i];
      const b = corridor.waypoints[i + 1];
      const dSeg = pointToSegmentMeters(point, a, b);
      if (dSeg < 680) {
        const proximityFactor = 1 - dSeg / 680;
        const bonus = corridor.acousticMaskingBonusDba * (0.65 + 0.35 * proximityFactor);
        if (bonus > bestBonus) {
          bestBonus = bonus;
          activeCorridor = corridor;
        }
      }
    }
  }

  return { bonusDba: Number(bestBonus.toFixed(2)), corridor: activeCorridor };
}

/**
 * Discretize a multi-waypoint 3D route into uniform spatial samples (~100m apart)
 */
function discretizeTrajectory(waypoints, sampleStepMeters = 100) {
  const samples = [];
  let cumulativeDistanceM = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const segDistM = Math.max(1, haversineMeters(start, end));
    const numSteps = Math.max(2, Math.ceil(segDistM / sampleStepMeters));

    const altStart = start.altFt ?? 850;
    const altEnd = end.altFt ?? 850;
    const speedStart = start.speedKt ?? 120;
    const speedEnd = end.speedKt ?? 120;
    const climbRateFtPerKm = (altEnd - altStart) / (segDistM / 1000);

    for (let s = 0; s < numSteps; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / numSteps;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      const altFt = altStart + (altEnd - altStart) * t;
      const speedKt = speedStart + (speedEnd - speedStart) * t;
      const distFromStartM = cumulativeDistanceM + segDistM * t;

      let flightPhase = 'CRUISE';
      if (distFromStartM < 450) {
        flightPhase = 'DEPARTURE_CLIMB';
      } else if (climbRateFtPerKm > 150) {
        flightPhase = 'CLIMB';
      } else if (climbRateFtPerKm < -150) {
        flightPhase = 'DESCENT';
      }

      samples.push({
        index: samples.length,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        altFt: Math.round(altFt),
        speedKt: Math.round(speedKt),
        distanceKm: Number((distFromStartM / 1000).toFixed(3)),
        distFromStartM,
        segmentIndex: i,
        flightPhase,
        climbRateFtPerKm: Math.round(climbRateFtPerKm)
      });
    }

    cumulativeDistanceM += segDistM;
  }

  const lastWp = waypoints[waypoints.length - 1];
  samples.push({
    index: samples.length,
    lat: Number(lastWp.lat.toFixed(6)),
    lng: Number(lastWp.lng.toFixed(6)),
    altFt: Math.round(lastWp.altFt ?? 300),
    speedKt: Math.round(lastWp.speedKt ?? 50),
    distanceKm: Number((cumulativeDistanceM / 1000).toFixed(3)),
    distFromStartM: cumulativeDistanceM,
    segmentIndex: Math.max(0, waypoints.length - 2),
    flightPhase: 'FINAL_APPROACH',
    climbRateFtPerKm: -180
  });

  for (const s of samples) {
    s.distToEndM = Math.max(0, cumulativeDistanceM - s.distFromStartM);
    // Vertiport industrial pad apron perimeter (~420m from takeoff/landing pad)
    s.isVertiportApron = s.distFromStartM < 420 || s.distToEndM < 420;
  }

  return {
    samples,
    totalDistanceKm: Number((cumulativeDistanceM / 1000).toFixed(3)),
    totalDistanceMeters: Math.round(cumulativeDistanceM)
  };
}

/**
 * Compute perceived ground-level noise LAeq (dBA) from an eVTOL at a given 3D sample point
 * and horizontal distance to a receptor.
 */
function computeGroundNoiseDba(sample, horizDistMeters = 0, options = {}) {
  // On the vertiport apron climb/descent transition, acoustic shrouding & water/industrial pad buffers apply
  const effectiveAltFt = sample.isVertiportApron
    ? Math.max(sample.altFt, 980)
    : sample.altFt;
  const altMeters = Math.max(60, effectiveAltFt * FEET_TO_METERS);
  const slantRangeM = Math.sqrt(horizDistMeters * horizDistMeters + altMeters * altMeters);

  // Reference source level at R_ref = 100m (Joby S4 / Archer Midnight class ~64 dBA at 100m)
  const L_ref_100m = options.quietRotorMode ? 62.4 : 66.2;
  const R_ref = 100;

  // Spherical spreading: 20 * log10(R / R_ref) + atmospheric absorption (~0.005 dB/m)
  const spreadingLoss = 20 * Math.log10(Math.max(40, slantRangeM) / R_ref);
  const atmosphericLoss = 0.005 * Math.max(0, slantRangeM - R_ref);

  // Flight regime acoustic modifier
  let regimeDelta = 0;
  if (!sample.isVertiportApron) {
    if (sample.flightPhase === 'CLIMB') {
      regimeDelta = 1.2;
    } else if (sample.flightPhase === 'DESCENT') {
      regimeDelta = sample.climbRateFtPerKm < -380 ? 1.8 : -0.9;
    }
  }

  const speedDelta = ((sample.speedKt - 120) / 30) * 0.9;

  // Blue/Green water & Highway acoustic masking credit
  const masking = getFlywayMaskingBonus(sample);
  const maskingCredit = masking.bonusDba;

  const rawDba =
    L_ref_100m - spreadingLoss - atmosphericLoss + regimeDelta + speedDelta - maskingCredit;

  return {
    effectiveDba: Number(Math.max(35.0, rawDba).toFixed(1)),
    unmaskedDba: Number(Math.max(38.0, rawDba + maskingCredit).toFixed(1)),
    maskingCreditDba: maskingCredit,
    corridorName: masking.corridor ? masking.corridor.name : null,
    slantRangeMeters: Math.round(slantRangeM)
  };
}

/**
 * Evaluate full 3D trajectory against Boston neighborhoods, restricted airspace,
 * energy physics, and equity indices.
 */
function evaluateTrajectory(waypoints, context = {}) {
  const timeOfDay = context.timeOfDay || 'day';
  const weather = context.weather || 'clear';
  const quietRotorMode = Boolean(context.quietRotorMode);
  const customZones = Array.isArray(context.customZones) ? context.customZones : [];

  const allSensitiveZones = [
    ...SENSITIVE_ZONES,
    ...customZones.map((cz, idx) => ({
      id: cz.id || `custom-zone-${idx + 1}`,
      name: cz.name || `Community Dynamic Quiet Zone #${idx + 1}`,
      category: 'Citizen-Submitted Dynamic Quiet Zone',
      isEnvironmentalJustice: true,
      ejCriteria: ['Real-Time Community Protection Trigger'],
      population: cz.population || 18500,
      populationDensityPerSqKm: 12500,
      dayNoiseCapDba: cz.noiseCapDba || 53.0,
      nightNoiseCapDba: (cz.noiseCapDba || 53.0) - 5.0,
      ambientNoiseDba: 54.0,
      equityWeight: 1.65,
      minSafeAltitudeFt: cz.minSafeAltitudeFt || 1380,
      center: { lat: Number(cz.lat), lng: Number(cz.lng) },
      radiusMeters: cz.radiusMeters || 620,
      polygon: null,
      color: '#ec4899',
      isCustom: true
    }))
  ];

  const { samples, totalDistanceKm, totalDistanceMeters } = discretizeTrajectory(waypoints, 100);

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const geodesicMeters = Math.max(100, haversineMeters(origin, destination));
  const geodesicKm = Number((geodesicMeters / 1000).toFixed(3));
  const detourRatio = Number((totalDistanceMeters / geodesicMeters).toFixed(3));

  const zoneImpacts = {};
  for (const zone of allSensitiveZones) {
    const capDba = timeOfDay === 'night' ? zone.nightNoiseCapDba : zone.dayNoiseCapDba;
    zoneImpacts[zone.id] = {
      zoneId: zone.id,
      zoneName: zone.name,
      isEnvironmentalJustice: zone.isEnvironmentalJustice,
      isCustom: Boolean(zone.isCustom),
      equityWeight: zone.equityWeight,
      population: zone.population,
      noiseCapDba: capDba,
      minSafeAltitudeFt: zone.minSafeAltitudeFt,
      peakDba: 36.0,
      minDistanceMeters: Infinity,
      lowestAltitudeOverZoneFt: Infinity,
      samplesDirectlyOver: 0,
      samplesExceedingCap: 0,
      exceedanceDba: 0,
      exposedPopulation: 0,
      violated: false,
      worstSample: null
    };
  }

  const airspaceViolations = [];
  const restrictedStatus = {};
  for (const rZone of RESTRICTED_ZONES) {
    restrictedStatus[rZone.id] = {
      zoneId: rZone.id,
      zoneName: rZone.name,
      authority: rZone.authority,
      severity: rZone.severity,
      minDistanceMeters: Infinity,
      incursionSamples: 0,
      violated: false,
      worstSample: null
    };
  }

  const profileSamples = [];
  let maxRouteGroundDba = 0;
  let sumRouteGroundDba = 0;
  let flywayAlignedSamples = 0;

  for (const sample of samples) {
    const nadirAcoustic = computeGroundNoiseDba(sample, 0, { quietRotorMode });
    if (nadirAcoustic.corridorName || sample.isVertiportApron) {
      flywayAlignedSamples++;
    }

    let localThresholdDba = timeOfDay === 'night' ? 50.0 : 56.5;
    let activeZoneName = nadirAcoustic.corridorName || 'Urban/Water Transit Corridor';
    let isOverSensitiveZone = false;

    for (const zone of allSensitiveZones) {
      const distM = distanceToZoneMeters(sample, zone);
      const acousticAtZone = computeGroundNoiseDba(sample, distM, { quietRotorMode });
      const impact = zoneImpacts[zone.id];

      if (distM < impact.minDistanceMeters) {
        impact.minDistanceMeters = Math.round(distM);
      }

      if (distM === 0 && !sample.isVertiportApron) {
        isOverSensitiveZone = true;
        activeZoneName = zone.name;
        localThresholdDba = Math.min(localThresholdDba, impact.noiseCapDba);
        impact.samplesDirectlyOver++;
        if (sample.altFt < impact.lowestAltitudeOverZoneFt) {
          impact.lowestAltitudeOverZoneFt = sample.altFt;
        }
      }

      if (!sample.isVertiportApron && acousticAtZone.effectiveDba > impact.peakDba) {
        impact.peakDba = acousticAtZone.effectiveDba;
        impact.worstSample = {
          lat: sample.lat,
          lng: sample.lng,
          altFt: sample.altFt,
          distanceKm: sample.distanceKm,
          dba: acousticAtZone.effectiveDba
        };
      }

      if (!sample.isVertiportApron && acousticAtZone.effectiveDba > impact.noiseCapDba && distM <= 250) {
        impact.samplesExceedingCap++;
      }
    }

    for (const rZone of RESTRICTED_ZONES) {
      const distM = distanceToZoneMeters(sample, rZone);
      const rStat = restrictedStatus[rZone.id];
      if (distM < rStat.minDistanceMeters) {
        rStat.minDistanceMeters = Math.round(distM);
      }

      const altitudeUnsafe =
        (rZone.maxAllowedAltitudeFt && sample.altFt > rZone.maxAllowedAltitudeFt) ||
        (rZone.minSafeAltitudeFt && sample.altFt < rZone.minSafeAltitudeFt);

      if (distM < 120 && altitudeUnsafe && !sample.isVertiportApron) {
        rStat.incursionSamples++;
        rStat.violated = true;
        if (!rStat.worstSample) {
          rStat.worstSample = {
            lat: sample.lat,
            lng: sample.lng,
            altFt: sample.altFt,
            distanceKm: sample.distanceKm
          };
        }
      }
    }

    if (!sample.isVertiportApron && nadirAcoustic.effectiveDba > maxRouteGroundDba) {
      maxRouteGroundDba = nadirAcoustic.effectiveDba;
    }
    sumRouteGroundDba += nadirAcoustic.effectiveDba;

    profileSamples.push({
      distanceKm: sample.distanceKm,
      lat: sample.lat,
      lng: sample.lng,
      altFt: sample.altFt,
      speedKt: sample.speedKt,
      flightPhase: sample.flightPhase,
      groundDba: nadirAcoustic.effectiveDba,
      localThresholdDba: Number(localThresholdDba.toFixed(1)),
      maskingCreditDba: nadirAcoustic.maskingCreditDba,
      zoneLabel: activeZoneName,
      isOverSensitiveZone
    });
  }

  const zoneImpactList = Object.values(zoneImpacts).map((impact) => {
    const exceedance = Math.max(0, Number((impact.peakDba - impact.noiseCapDba).toFixed(1)));
    impact.exceedanceDba = exceedance;
    impact.violated =
      exceedance > 0.3 ||
      (impact.samplesDirectlyOver >= 2 && impact.lowestAltitudeOverZoneFt < impact.minSafeAltitudeFt - 80);

    if (impact.violated) {
      const overflightFraction = Math.min(
        0.65,
        0.12 + impact.samplesDirectlyOver * 0.04 + exceedance * 0.04
      );
      impact.exposedPopulation = Math.round(impact.population * overflightFraction);
    } else {
      impact.exposedPopulation = 0;
    }

    if (impact.lowestAltitudeOverZoneFt === Infinity) {
      impact.lowestAltitudeOverZoneFt = null;
    }
    return impact;
  });

  for (const rStat of Object.values(restrictedStatus)) {
    if (rStat.violated) {
      airspaceViolations.push(rStat);
    }
  }

  // Calculate Jain's Fairness Index across all Boston neighborhoods
  const neighborhoodUtilities = zoneImpactList.map((z) => {
    const excessPenalty = z.exceedanceDba * 7.5 * z.equityWeight;
    const overflightPenalty = z.violated ? z.samplesDirectlyOver * 2.5 * z.equityWeight : 0;
    const proximityPenalty = Math.max(0, (z.peakDba - 44) * 0.65);
    return Math.max(15, Math.min(100, 100 - excessPenalty - overflightPenalty - proximityPenalty));
  });

  const nZones = neighborhoodUtilities.length;
  const sumU = neighborhoodUtilities.reduce((a, b) => a + b, 0);
  const sumSqU = neighborhoodUtilities.reduce((a, b) => a + b * b, 0);
  const jainsFairnessIndex = Number(((sumU * sumU) / (nZones * sumSqU)).toFixed(4));

  const totalEjExposedPopulation = zoneImpactList
    .filter((z) => z.isEnvironmentalJustice && z.violated)
    .reduce((acc, z) => acc + z.exposedPopulation, 0);

  const totalViolatedZones = zoneImpactList.filter((z) => z.violated).length;

  // Compute eVTOL Flight Time & Energy Consumption Physics
  const avgCruiseSpeedKt =
    samples.reduce((acc, s) => acc + s.speedKt, 0) / Math.max(1, samples.length);
  const avgSpeedKmh = avgCruiseSpeedKt * 1.852;
  const windHeadwindFactor = weather === 'windy' ? 1.12 : weather === 'fog' ? 1.05 : 1.0;

  const flightTimeMin = Number(
    (0.85 + (totalDistanceKm / Math.max(60, avgSpeedKmh)) * 60 * windHeadwindFactor).toFixed(2)
  );

  const maxAltitudeFt = Math.max(...samples.map((s) => s.altFt));
  const climbEnergyKwh = ((maxAltitudeFt - 100) / 1000) * 1.95;
  const hoverTransitionKwh = 3.5;
  const cruiseEnergyKwh =
    totalDistanceKm * 1.42 * windHeadwindFactor * (quietRotorMode ? 1.04 : 1.0);
  const totalEnergyKwh = Number((hoverTransitionKwh + climbEnergyKwh + cruiseEnergyKwh).toFixed(2));
  const batteryPackKwh = 160;
  const batterySocUsedPct = Number(((totalEnergyKwh / batteryPackKwh) * 100).toFixed(1));
  const operatingCostUsd = Number((totalEnergyKwh * 0.42 + flightTimeMin * 4.85).toFixed(2));

  const flywayAlignmentPct = Math.round((flywayAlignedSamples / Math.max(1, samples.length)) * 100);

  return {
    totalDistanceKm,
    geodesicKm,
    detourRatio,
    flightTimeMin,
    totalEnergyKwh,
    batterySocUsedPct,
    operatingCostUsd,
    maxAltitudeFt,
    avgCruiseSpeedKt: Math.round(avgCruiseSpeedKt),
    peakGroundDba: Number(maxRouteGroundDba.toFixed(1)),
    avgGroundDba: Number((sumRouteGroundDba / Math.max(1, samples.length)).toFixed(1)),
    jainsFairnessIndex,
    totalEjExposedPopulation,
    totalViolatedZones,
    airspaceViolationsCount: airspaceViolations.length,
    airspaceViolations,
    restrictedStatus: Object.values(restrictedStatus),
    zoneImpacts: zoneImpactList,
    flywayAlignmentPct,
    profileSamples
  };
}

module.exports = {
  haversineMeters,
  pointToSegmentMeters,
  isPointInPolygon,
  distanceToZoneMeters,
  discretizeTrajectory,
  computeGroundNoiseDba,
  evaluateTrajectory
};
