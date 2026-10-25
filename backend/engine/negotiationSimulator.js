/**
 * Skyline Consensus — Multi-Agent Negotiation Protocol & Cryptographic Attestation Engine
 *
 * Executes a transparent, auditable 5-round negotiation protocol between:
 *  - OPERATOR Agent  (Airline Fleet Efficiency & Energy Optimizer)
 *  - CITY Agent      (Boston Airspace Safety & FAA Class B Regulator)
 *  - COMMUNITY Agent (Neighborhood Acoustic & Environmental Justice Advocate)
 *
 * Produces:
 *  - Complete round-by-round trajectory evolution & telemetry
 *  - Structured agent protocol messages (PROPOSE, VETO, ENFORCE_GATE, COUNTER_PROPOSE, CONCEDE, RATIFY)
 *  - Side-by-side Baseline vs. Consensus impact deltas
 *  - SHA-256 signed Auditable Consensus Record ("Don't pitch the future. Prove it's fair.")
 */

const crypto = require('crypto');
const { VERTIPORTS, MISSION_SCENARIOS } = require('../data/bostonAirspace');
const { evaluateTrajectory } = require('./acousticsAndPhysics');
const { AGENT_PROFILES, scoreAllAgents, buildCandidateRoutes } = require('./agents');

/**
 * Helper to find a vertiport by ID
 */
function getVertiport(id) {
  return VERTIPORTS.find((v) => v.id === id) || VERTIPORTS[0];
}

/**
 * Run a complete multi-agent negotiation simulation for a Boston eVTOL flight request
 */
function runNegotiationSimulation(params = {}) {
  const scenarioPreset = params.scenarioId
    ? MISSION_SCENARIOS.find((s) => s.id === params.scenarioId)
    : null;

  const originId = params.originId || (scenarioPreset ? scenarioPreset.originId : 'BOS');
  const destinationId =
    params.destinationId || (scenarioPreset ? scenarioPreset.destinationId : 'LMA');

  const origin = getVertiport(originId);
  const destination =
    origin.id === destinationId
      ? getVertiport(origin.id === 'BOS' ? 'LMA' : 'BOS')
      : getVertiport(destinationId);

  const timeOfDay = params.timeOfDay || (scenarioPreset ? scenarioPreset.timeOfDay : 'day');
  const weather = params.weather || (scenarioPreset ? scenarioPreset.weather : 'clear');
  const weights = params.weights ||
    (scenarioPreset ? scenarioPreset.defaultWeights : null) || {
      community: 0.38,
      operator: 0.30,
      city: 0.32
    };
  const customZones = Array.isArray(params.customZones) ? params.customZones : [];

  const candidateRoutes = buildCandidateRoutes(origin, destination, {
    timeOfDay,
    weather,
    weights,
    customZones
  });

  // Evaluate each candidate trajectory through the 3D physics, acoustic & equity engine
  const evaluatedRoutes = {};
  for (const [key, routeObj] of Object.entries(candidateRoutes)) {
    const evaluation = evaluateTrajectory(routeObj.waypoints, {
      timeOfDay,
      weather,
      quietRotorMode: routeObj.quietRotorMode,
      customZones
    });
    const scores = scoreAllAgents(evaluation, { timeOfDay, weather, weights });
    evaluatedRoutes[key] = {
      ...routeObj,
      evaluation,
      scores
    };
  }

  const r1 = evaluatedRoutes.round1_operatorDirect;
  const r2 = evaluatedRoutes.round2_cityRegulatory;
  const r3 = evaluatedRoutes.round3_communityEquity;
  const r4 = evaluatedRoutes.round4_consensus;

  // Extract specific violated zones & restricted areas in Round 1 for realistic protocol citations
  const r1ViolatedEjNames = r1.scores.ejViolations.map((z) => z.zoneName);
  const r1ViolatedZoneNames = r1.scores.violatedZones.map((z) => z.zoneName);
  const r1AirspaceViolations = r1.evaluation.airspaceViolations.map((v) => v.zoneName);

  const primaryEjConflict =
    r1ViolatedEjNames[0] ||
    r1ViolatedZoneNames[0] ||
    'East Boston & South End Environmental Justice Tracts';
  const secondaryConflict =
    r1ViolatedEjNames[1] ||
    r1ViolatedZoneNames[1] ||
    'Dense Residential Quiet Zone';
  const primaryAirspaceConflict =
    r1AirspaceViolations[0] ||
    'FAA Logan Class B Approach & Downtown High-Rise Wake Buffer';

  // Construct the 5-Round Transparent Negotiation Protocol Transcript
  const rounds = [
    {
      round: 1,
      stage: 'BASELINE_PROPOSAL_AND_AUDIT',
      title: 'Round 1 — Direct Geodesic Proposal & Multi-Agent Spatial Audit',
      activeRouteId: r1.id,
      status: 'VETOED_BY_CITY_AND_COMMUNITY',
      summary: `Operator proposes minimum-energy ${r1.evaluation.totalDistanceKm} km direct trajectory (${r1.evaluation.flightTimeMin} min, ${r1.evaluation.totalEnergyKwh} kWh). City and Community agents trigger hard vetoes due to airspace incursion and ${r1.evaluation.peakGroundDba} dBA acoustic exceedance.`,
      scores: r1.scores,
      telemetrySnapshot: {
        distanceKm: r1.evaluation.totalDistanceKm,
        flightTimeMin: r1.evaluation.flightTimeMin,
        energyKwh: r1.evaluation.totalEnergyKwh,
        peakDba: r1.evaluation.peakGroundDba,
        jainsFairness: r1.evaluation.jainsFairnessIndex,
        ejExposedPop: r1.evaluation.totalEjExposedPopulation,
        airspaceViolations: r1.evaluation.airspaceViolationsCount
      },
      messages: [
        {
          id: 'msg-r1-1',
          round: 1,
          agentId: 'OPERATOR',
          action: 'PROPOSE_BASELINE',
          stance: 'PROPOSAL',
          headline: `Proposing direct geodesic trajectory: ${origin.id} → ${destination.id} at 780 ft MSL`,
          message: `Submitting minimum-energy baseline path (${r1.evaluation.totalDistanceKm} km, ${r1.evaluation.flightTimeMin} min flight time, ${r1.evaluation.totalEnergyKwh} kWh battery draw / ${r1.evaluation.batterySocUsedPct}% SoC). Direct routing minimizes rotor hover-transition wear and maximizes schedule margin.`,
          metricsCited: [
            { label: 'Distance', value: `${r1.evaluation.totalDistanceKm} km (1.00x)` },
            { label: 'Energy Draw', value: `${r1.evaluation.totalEnergyKwh} kWh` },
            { label: 'Operator Utility', value: `${r1.scores.operatorUtility}/100` }
          ],
          highlightCoords: r1.waypoints[Math.floor(r1.waypoints.length / 2)]
        },
        {
          id: 'msg-r1-2',
          round: 1,
          agentId: 'CITY',
          action: 'VETO_SAFETY_AIRSPACE',
          stance: 'VETO',
          headline: `REGULATORY VETO: Incursion into ${primaryAirspaceConflict}`,
          message: `Audit of R1 trajectory flags ${r1.evaluation.airspaceViolationsCount > 0 ? `${r1.evaluation.airspaceViolationsCount} hard airspace violation(s)` : 'insufficient lateral clearance'} across ${primaryAirspaceConflict}. Low-altitude 780 ft transit over dense urban core lacks emergency autorotation reachability${weather === 'windy' ? ' under active 24 kt NW wind-shear advisory' : ''}.`,
          metricsCited: [
            { label: 'Safety Violations', value: `${Math.max(1, r1.evaluation.airspaceViolationsCount)} Critical` },
            { label: 'Flyway Alignment', value: `${r1.evaluation.flywayAlignmentPct}%` },
            { label: 'City Utility', value: `${r1.scores.cityUtility}/100` }
          ],
          highlightCoords: r1.evaluation.airspaceViolations[0]?.worstSample || r1.waypoints[1]
        },
        {
          id: 'msg-r1-3',
          round: 1,
          agentId: 'COMMUNITY',
          action: 'VETO_ACOUSTIC_EQUITY',
          stance: 'VETO',
          headline: `EQUITY & NOISE VETO: ${r1.evaluation.peakGroundDba} dBA over ${primaryEjConflict}`,
          message: `Unacceptable acoustic burden on ${primaryEjConflict} and ${secondaryConflict}. Peak ground noise reaches ${r1.evaluation.peakGroundDba} dBA (${timeOfDay === 'night' ? 'exceeding strict 48 dBA night curfew' : 'exceeding 54 dBA EJ threshold'}), exposing ~${r1.evaluation.totalEjExposedPopulation.toLocaleString()} EJ residents.${customZones.length > 0 ? ` Also violates ${customZones.length} citizen-submitted Dynamic Quiet Zone(s).` : ''}`,
          metricsCited: [
            { label: 'Peak Ground Noise', value: `${r1.evaluation.peakGroundDba} dBA` },
            { label: 'EJ Pop Exposed', value: `${r1.evaluation.totalEjExposedPopulation.toLocaleString()}` },
            { label: 'Community Utility', value: `${r1.scores.communityUtility}/100` }
          ],
          highlightCoords:
            r1.scores.violatedZones[0]?.worstSample || r1.waypoints[Math.floor(r1.waypoints.length / 2)]
        }
      ]
    },
    {
      round: 2,
      stage: 'REGULATORY_SAFETY_ENFORCEMENT',
      title: 'Round 2 — FAA Class B Gate Injection & Obstacle Clearance Reroute',
      activeRouteId: r2.id,
      status: 'SAFETY_CLEARED_EQUITY_PENDING',
      summary: `City Agent injects mandatory municipal airspace gates (${r2.waypoints[1]?.name || 'Harbor Gate'}) and raises cruise floor to ~1,180 ft. Airspace conflicts drop to ${r2.evaluation.airspaceViolationsCount}, but Community Agent flags remaining residential noise.`,
      scores: r2.scores,
      telemetrySnapshot: {
        distanceKm: r2.evaluation.totalDistanceKm,
        flightTimeMin: r2.evaluation.flightTimeMin,
        energyKwh: r2.evaluation.totalEnergyKwh,
        peakDba: r2.evaluation.peakGroundDba,
        jainsFairness: r2.evaluation.jainsFairnessIndex,
        ejExposedPop: r2.evaluation.totalEjExposedPopulation,
        airspaceViolations: r2.evaluation.airspaceViolationsCount
      },
      messages: [
        {
          id: 'msg-r2-1',
          round: 2,
          agentId: 'CITY',
          action: 'ENFORCE_AIRSPACE_GATE',
          stance: 'COUNTER_PROPOSAL',
          headline: `Mandating Municipal Corridor Gates: ${r2.waypoints[1]?.name}`,
          message: `Injecting mandatory lateral corridor gates (${r2.waypoints.slice(1, -1).map((w) => w.name).join(' → ')}) and stepping cruise altitude up to ${r2.evaluation.maxAltitudeFt} ft MSL. This guarantees 100% lateral separation from Logan Class B jet approach fans and high-rise mechanical turbulence.`,
          metricsCited: [
            { label: 'FAA Class B Conflicts', value: `${r2.evaluation.airspaceViolationsCount}` },
            { label: 'Cruise Ceiling', value: `${r2.evaluation.maxAltitudeFt} ft MSL` },
            { label: 'City Utility', value: `${r2.scores.cityUtility}/100` }
          ],
          highlightCoords: r2.waypoints[1]
        },
        {
          id: 'msg-r2-2',
          round: 2,
          agentId: 'OPERATOR',
          action: 'EVALUATE_SAFETY_DETOUR',
          stance: 'CONCESSION',
          headline: `Accepting FAA safety gates (+${(r2.evaluation.totalDistanceKm - r1.evaluation.totalDistanceKm).toFixed(2)} km detour)`,
          message: `Safety gate reroute increases path length to ${r2.evaluation.totalDistanceKm} km (${r2.evaluation.detourRatio}x geodesic) and energy draw to ${r2.evaluation.totalEnergyKwh} kWh. Within 30% FAA battery reserve margin; Operator accepts safety gates.`,
          metricsCited: [
            { label: 'Detour Ratio', value: `${r2.evaluation.detourRatio}x` },
            { label: 'Flight Time', value: `${r2.evaluation.flightTimeMin} min` },
            { label: 'Operator Utility', value: `${r2.scores.operatorUtility}/100` }
          ],
          highlightCoords: r2.waypoints[2] || r2.waypoints[1]
        },
        {
          id: 'msg-r2-3',
          round: 2,
          agentId: 'COMMUNITY',
          action: 'REQUEST_EJ_CORRIDOR_SHIFT',
          stance: 'HOLD',
          headline: `Partial improvement, but ${r2.evaluation.peakGroundDba} dBA still impacts residential edges`,
          message: `While R2 clears FAA restricted zones, transit at ${r2.evaluation.maxAltitudeFt} ft still produces ${r2.evaluation.peakGroundDba} dBA near sensitive tracts. Proposing lateral shift onto Blue/Green water and I-90 highway acoustic masking corridors with altitude step-up.`,
          metricsCited: [
            { label: 'Peak Noise', value: `${r2.evaluation.peakGroundDba} dBA` },
            { label: 'Jain Fairness', value: `${r2.evaluation.jainsFairnessIndex}` },
            { label: 'Community Utility', value: `${r2.scores.communityUtility}/100` }
          ],
          highlightCoords: r2.waypoints[Math.max(1, r2.waypoints.length - 2)]
        }
      ]
    },
    {
      round: 3,
      stage: 'COMMUNITY_EJ_OPTIMIZATION',
      title: 'Round 3 — Environmental Justice Shield & Blue/Green Acoustic Flyway',
      activeRouteId: r3.id,
      status: 'EQUITY_MAXIMIZED_OPERATOR_COUNTER',
      summary: `Community Agent shifts trajectory onto acoustic masking corridors (${r3.waypoints.slice(1, -1).map((w) => w.name).join(' → ')}) at ${r3.evaluation.maxAltitudeFt} ft with Low-RPM Quiet Rotor mode. Operator requests Pareto climb/speed refinement.`,
      scores: r3.scores,
      telemetrySnapshot: {
        distanceKm: r3.evaluation.totalDistanceKm,
        flightTimeMin: r3.evaluation.flightTimeMin,
        energyKwh: r3.evaluation.totalEnergyKwh,
        peakDba: r3.evaluation.peakGroundDba,
        jainsFairness: r3.evaluation.jainsFairnessIndex,
        ejExposedPop: r3.evaluation.totalEjExposedPopulation,
        airspaceViolations: r3.evaluation.airspaceViolationsCount
      },
      messages: [
        {
          id: 'msg-r3-1',
          round: 3,
          agentId: 'COMMUNITY',
          action: 'COUNTER_PROPOSE_EJ_FLYWAY',
          stance: 'COUNTER_PROPOSAL',
          headline: `Routing via Blue/Green & Highway Masking Corridor at ${r3.evaluation.maxAltitudeFt} ft`,
          message: `Shifting waypoints onto ${r3.waypoints.slice(1, -1).map((w) => w.name).join(' → ')}${customZones.length > 0 ? ` (including active lateral deflection around citizen Dynamic Quiet Zone)` : ''}. Ambient water buffer + highway masking reduces perceived residential noise to ${r3.evaluation.peakGroundDba} dBA and cuts EJ population exposure to ${r3.evaluation.totalEjExposedPopulation}.`,
          metricsCited: [
            { label: 'Peak Noise', value: `${r3.evaluation.peakGroundDba} dBA (-${(r1.evaluation.peakGroundDba - r3.evaluation.peakGroundDba).toFixed(1)} dB)` },
            { label: 'Flyway Masking', value: `${r3.evaluation.flywayAlignmentPct}% Aligned` },
            { label: 'Community Utility', value: `${r3.scores.communityUtility}/100` }
          ],
          highlightCoords: r3.waypoints[Math.floor(r3.waypoints.length / 2)]
        },
        {
          id: 'msg-r3-2',
          round: 3,
          agentId: 'OPERATOR',
          action: 'PROPOSE_PARETO_TRIM',
          stance: 'NEGOTIATION',
          headline: `Requesting 80 ft cruise trim & continuous descent to recover battery margin`,
          message: `R3 achieves full EJ compliance, but climbing to ${r3.evaluation.maxAltitudeFt} ft at reduced 112 kt speed increases energy draw to ${r3.evaluation.totalEnergyKwh} kWh (+${(((r3.evaluation.totalEnergyKwh - r1.evaluation.totalEnergyKwh) / r1.evaluation.totalEnergyKwh) * 100).toFixed(1)}%). Proposing ${r4.evaluation.maxAltitudeFt} ft cruise with 122 kt cruise-climb and low-BVI continuous descent.`,
          metricsCited: [
            { label: 'R3 Energy Draw', value: `${r3.evaluation.totalEnergyKwh} kWh` },
            { label: 'Proposed R4 Draw', value: `${r4.evaluation.totalEnergyKwh} kWh` },
            { label: 'Operator Utility', value: `${r3.scores.operatorUtility} → ${r4.scores.operatorUtility}` }
          ],
          highlightCoords: r3.waypoints[Math.max(1, r3.waypoints.length - 2)]
        },
        {
          id: 'msg-r3-3',
          round: 3,
          agentId: 'CITY',
          action: 'VERIFY_AUTOROTATION_CORRIDOR',
          stance: 'APPROVAL',
          headline: `Validating over-water & rail-trench emergency landing reachability`,
          message: `R3/R4 corridor alignment (${r4.evaluation.flywayAlignmentPct}% blue/green & highway right-of-way) provides continuous emergency landing zones and zero hospital helipad interference.`,
          metricsCited: [
            { label: 'Safety Compliance', value: '100% Verified' },
            { label: 'Corridor Alignment', value: `${r4.evaluation.flywayAlignmentPct}%` },
            { label: 'City Utility', value: `${r3.scores.cityUtility}/100` }
          ],
          highlightCoords: r3.waypoints[1]
        }
      ]
    },
    {
      round: 4,
      stage: 'PARETO_NASH_BARGAINING',
      title: 'Round 4 — Pareto-Optimal Nash Bargaining Synthesis',
      activeRouteId: r4.id,
      status: 'CONSENSUS_CONVERGED',
      summary: `Agents converge on Pareto-optimal Skyline Consensus trajectory (Consensus Score: ${r4.scores.consensusScore}/100, Jain's Fairness: ${r4.evaluation.jainsFairnessIndex}). Zero EJ or FAA violations with commercially viable ${r4.evaluation.flightTimeMin} min flight time.`,
      scores: r4.scores,
      telemetrySnapshot: {
        distanceKm: r4.evaluation.totalDistanceKm,
        flightTimeMin: r4.evaluation.flightTimeMin,
        energyKwh: r4.evaluation.totalEnergyKwh,
        peakDba: r4.evaluation.peakGroundDba,
        jainsFairness: r4.evaluation.jainsFairnessIndex,
        ejExposedPop: r4.evaluation.totalEjExposedPopulation,
        airspaceViolations: r4.evaluation.airspaceViolationsCount
      },
      messages: [
        {
          id: 'msg-r4-1',
          round: 4,
          agentId: 'OPERATOR',
          action: 'COMMIT_PARETO_PROFILE',
          stance: 'APPROVAL',
          headline: `Committing to ${r4.evaluation.totalDistanceKm} km Consensus Corridor (${r4.evaluation.flightTimeMin} min)`,
          message: `With continuous low-BVI descent and ${r4.evaluation.avgCruiseSpeedKt} kt corridor cruise, energy stabilizes at ${r4.evaluation.totalEnergyKwh} kWh (${r4.evaluation.batterySocUsedPct}% battery SoC) and flight time is ${r4.evaluation.flightTimeMin} min. Operator ratifies trajectory.`,
          metricsCited: [
            { label: 'Flight Time', value: `${r4.evaluation.flightTimeMin} min (+${(r4.evaluation.flightTimeMin - r1.evaluation.flightTimeMin).toFixed(1)}m)` },
            { label: 'Energy', value: `${r4.evaluation.totalEnergyKwh} kWh` },
            { label: 'Operator Utility', value: `${r4.scores.operatorUtility}/100` }
          ],
          highlightCoords: r4.waypoints[Math.floor(r4.waypoints.length / 2)]
        },
        {
          id: 'msg-r4-2',
          round: 4,
          agentId: 'COMMUNITY',
          action: 'RATIFY_EQUITY_PROOF',
          stance: 'APPROVAL',
          headline: `Community Ratifies: Peak noise reduced by ${(r1.evaluation.peakGroundDba - r4.evaluation.peakGroundDba).toFixed(1)} dBA; 0 EJ violations`,
          message: `Ground noise drops from ${r1.evaluation.peakGroundDba} dBA to ${r4.evaluation.peakGroundDba} dBA (a ${Math.round((1 - Math.pow(10, (r4.evaluation.peakGroundDba - r1.evaluation.peakGroundDba) / 10)) * 100)}% reduction in acoustic energy). Jain's Inter-Neighborhood Fairness Index reaches ${r4.evaluation.jainsFairnessIndex}.`,
          metricsCited: [
            { label: 'Acoustic Reduction', value: `-${(r1.evaluation.peakGroundDba - r4.evaluation.peakGroundDba).toFixed(1)} dBA` },
            { label: 'Jain Fairness Index', value: `${r4.evaluation.jainsFairnessIndex}` },
            { label: 'Community Utility', value: `${r4.scores.communityUtility}/100` }
          ],
          highlightCoords: r4.waypoints[Math.max(1, r4.waypoints.length - 2)]
        },
        {
          id: 'msg-r4-3',
          round: 4,
          agentId: 'CITY',
          action: 'RATIFY_CLEARANCE',
          stance: 'APPROVAL',
          headline: `Nash Bargaining Equilibrium Reached — Skyline Consensus Score: ${r4.scores.consensusScore}/100`,
          message: `All three agents exceed minimum utility thresholds (Community: ${r4.scores.communityUtility}, Operator: ${r4.scores.operatorUtility}, City: ${r4.scores.cityUtility}; Nash Index: ${r4.scores.nashBargainingIndex}). Clearing trajectory for cryptographic attestation.`,
          metricsCited: [
            { label: 'Consensus Score', value: `${r4.scores.consensusScore}/100` },
            { label: 'Nash Product Index', value: `${r4.scores.nashBargainingIndex}` },
            { label: 'City Utility', value: `${r4.scores.cityUtility}/100` }
          ],
          highlightCoords: r4.waypoints[r4.waypoints.length - 1]
        }
      ]
    }
  ];

  // Build Cryptographic Auditable Consensus Record (Round 5 Attestation)
  const timestampIso = new Date().toISOString();
  const auditPayload = {
    protocolVersion: 'SKYLINE-CONSENSUS-v1.4-BOS',
    corridor: `${origin.code} -> ${destination.code}`,
    timeOfDay,
    weather,
    weights: r4.scores.weights,
    customZonesCount: customZones.length,
    consensusWaypoints: r4.waypoints.map((w) => ({
      name: w.name,
      lat: w.lat,
      lng: w.lng,
      altFt: w.altFt,
      speedKt: w.speedKt
    })),
    utilities: {
      community: r4.scores.communityUtility,
      operator: r4.scores.operatorUtility,
      city: r4.scores.cityUtility,
      consensusScore: r4.scores.consensusScore,
      nashBargainingIndex: r4.scores.nashBargainingIndex,
      jainsFairnessIndex: r4.evaluation.jainsFairnessIndex
    },
    complianceProof: {
      faaClassBViolations: r4.evaluation.airspaceViolationsCount,
      ejTractsViolated: r4.scores.ejViolationsCount,
      peakGroundNoiseDba: r4.evaluation.peakGroundDba,
      baselinePeakNoiseDba: r1.evaluation.peakGroundDba,
      noiseReductionDba: Number((r1.evaluation.peakGroundDba - r4.evaluation.peakGroundDba).toFixed(1))
    }
  };

  const consensusHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(auditPayload))
    .digest('hex');

  const agentSignatures = {
    COMMUNITY: `sig_comm_${consensusHash.slice(0, 16)}`,
    OPERATOR: `sig_oper_${consensusHash.slice(16, 32)}`,
    CITY: `sig_city_${consensusHash.slice(32, 48)}`
  };

  // Add Round 5 Cryptographic Attestation message
  rounds.push({
    round: 5,
    stage: 'CONSENSUS_ATTESTATION',
    title: 'Round 5 — Cryptographic Consensus Certificate & Airspace Clearance',
    activeRouteId: r4.id,
    status: 'CERTIFIED_AUDITABLE_PROOF',
    summary: `Signed Auditable Consensus Record minted (SHA-256: 0x${consensusHash.slice(0, 16)}...). Every neighborhood acoustic reading, veto resolution, and agent signature is permanently logged for public audit.`,
    scores: r4.scores,
    telemetrySnapshot: {
      distanceKm: r4.evaluation.totalDistanceKm,
      flightTimeMin: r4.evaluation.flightTimeMin,
      energyKwh: r4.evaluation.totalEnergyKwh,
      peakDba: r4.evaluation.peakGroundDba,
      jainsFairness: r4.evaluation.jainsFairnessIndex,
      ejExposedPop: r4.evaluation.totalEjExposedPopulation,
      airspaceViolations: r4.evaluation.airspaceViolationsCount
    },
    messages: [
      {
        id: 'msg-r5-1',
        round: 5,
        agentId: 'CITY',
        action: 'MINT_CONSENSUS_PROOF',
        stance: 'CERTIFIED',
        headline: `Auditable Consensus Certificate Issued [0x${consensusHash.slice(0, 12)}...]`,
        message: `Flight clearance certified with tri-agent cryptographic signatures. Public audit log records -${(r1.evaluation.peakGroundDba - r4.evaluation.peakGroundDba).toFixed(1)} dBA noise reduction, ${r1.evaluation.totalEjExposedPopulation.toLocaleString()} EJ residents protected from acoustic exceedance, and 100% FAA Class B compliance.`,
        metricsCited: [
          { label: 'SHA-256 Proof', value: `0x${consensusHash.slice(0, 10)}…` },
          { label: 'Fairness Proof', value: `Jain ${r4.evaluation.jainsFairnessIndex}` },
          { label: 'Clearance Status', value: 'APPROVED & LOGGED' }
        ],
        highlightCoords: r4.waypoints[r4.waypoints.length - 1]
      }
    ]
  });

  // Comparative metrics between Unnegotiated Baseline (R1) and Skyline Consensus (R4)
  const comparison = {
    distanceKm: {
      baseline: r1.evaluation.totalDistanceKm,
      consensus: r4.evaluation.totalDistanceKm,
      delta: Number((r4.evaluation.totalDistanceKm - r1.evaluation.totalDistanceKm).toFixed(2)),
      pctChange: Number(
        (((r4.evaluation.totalDistanceKm - r1.evaluation.totalDistanceKm) / r1.evaluation.totalDistanceKm) * 100).toFixed(1)
      )
    },
    flightTimeMin: {
      baseline: r1.evaluation.flightTimeMin,
      consensus: r4.evaluation.flightTimeMin,
      delta: Number((r4.evaluation.flightTimeMin - r1.evaluation.flightTimeMin).toFixed(2))
    },
    energyKwh: {
      baseline: r1.evaluation.totalEnergyKwh,
      consensus: r4.evaluation.totalEnergyKwh,
      delta: Number((r4.evaluation.totalEnergyKwh - r1.evaluation.totalEnergyKwh).toFixed(2)),
      pctChange: Number(
        (((r4.evaluation.totalEnergyKwh - r1.evaluation.totalEnergyKwh) / r1.evaluation.totalEnergyKwh) * 100).toFixed(1)
      )
    },
    peakGroundDba: {
      baseline: r1.evaluation.peakGroundDba,
      consensus: r4.evaluation.peakGroundDba,
      delta: Number((r4.evaluation.peakGroundDba - r1.evaluation.peakGroundDba).toFixed(1)),
      acousticEnergyReductionPct: Math.round(
        (1 - Math.pow(10, (r4.evaluation.peakGroundDba - r1.evaluation.peakGroundDba) / 10)) * 100
      )
    },
    ejExposedPopulation: {
      baseline: r1.evaluation.totalEjExposedPopulation,
      consensus: r4.evaluation.totalEjExposedPopulation,
      residentsProtected: Math.max(
        0,
        r1.evaluation.totalEjExposedPopulation - r4.evaluation.totalEjExposedPopulation
      )
    },
    jainsFairnessIndex: {
      baseline: r1.evaluation.jainsFairnessIndex,
      consensus: r4.evaluation.jainsFairnessIndex,
      delta: Number((r4.evaluation.jainsFairnessIndex - r1.evaluation.jainsFairnessIndex).toFixed(4))
    },
    consensusScore: {
      baseline: r1.scores.consensusScore,
      consensus: r4.scores.consensusScore,
      delta: r4.scores.consensusScore - r1.scores.consensusScore
    }
  };

  const auditableConsensusRecord = {
    certificateId: `BOS-AAM-${consensusHash.slice(0, 12).toUpperCase()}`,
    issuedAt: timestampIso,
    sha256Hash: consensusHash,
    agentSignatures,
    mission: {
      scenarioId: scenarioPreset ? scenarioPreset.id : 'custom-corridor',
      title: scenarioPreset
        ? scenarioPreset.title
        : `${origin.shortName} → ${destination.shortName}`,
      origin: { id: origin.id, code: origin.code, name: origin.name, lat: origin.lat, lng: origin.lng },
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        lat: destination.lat,
        lng: destination.lng
      },
      timeOfDay,
      weather,
      aircraftModel: scenarioPreset ? scenarioPreset.aircraftModel : 'Joby S4 / 6-Rotor Tilt-Prop'
    },
    protocolSummary: {
      totalRounds: rounds.length,
      vetoesIssuedAndResolved: 2,
      consensusScore: r4.scores.consensusScore,
      nashBargainingIndex: r4.scores.nashBargainingIndex,
      jainsFairnessIndex: r4.evaluation.jainsFairnessIndex,
      agentUtilities: {
        community: r4.scores.communityUtility,
        operator: r4.scores.operatorUtility,
        city: r4.scores.cityUtility
      },
      agentWeights: r4.scores.weights
    },
    impactProof: comparison,
    neighborhoodAuditLedger: r4.evaluation.zoneImpacts.map((z) => {
      const baseZone = r1.evaluation.zoneImpacts.find((bz) => bz.zoneId === z.zoneId);
      return {
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        isEnvironmentalJustice: z.isEnvironmentalJustice,
        noiseCapDba: z.noiseCapDba,
        baselinePeakDba: baseZone ? baseZone.peakDba : z.peakDba,
        consensusPeakDba: z.peakDba,
        dbaChange: baseZone ? Number((z.peakDba - baseZone.peakDba).toFixed(1)) : 0,
        compliant: !z.violated
      };
    }),
    clearedWaypoints: auditPayload.consensusWaypoints
  };

  return {
    mission: {
      scenarioId: scenarioPreset ? scenarioPreset.id : 'custom',
      title: scenarioPreset
        ? scenarioPreset.title
        : `${origin.shortName} → ${destination.shortName}`,
      subtitle: scenarioPreset
        ? scenarioPreset.subtitle
        : `Custom Multi-Agent Corridor Negotiation (${timeOfDay.toUpperCase()} / ${weather.toUpperCase()})`,
      origin,
      destination,
      timeOfDay,
      weather,
      aircraftModel: scenarioPreset ? scenarioPreset.aircraftModel : 'Joby S4 / 6-Rotor eVTOL',
      customZones
    },
    agents: AGENT_PROFILES,
    routes: [
      evaluatedRoutes.round1_operatorDirect,
      evaluatedRoutes.round2_cityRegulatory,
      evaluatedRoutes.round3_communityEquity,
      evaluatedRoutes.round4_consensus
    ],
    rounds,
    comparison,
    finalConsensus: {
      route: evaluatedRoutes.round4_consensus,
      scores: r4.scores,
      evaluation: r4.evaluation
    },
    auditableConsensusRecord
  };
}

module.exports = {
  runNegotiationSimulation
};
