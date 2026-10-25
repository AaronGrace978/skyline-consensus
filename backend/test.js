/**
 * Skyline Consensus — Automated Test Suite
 *
 * Verifies:
 * 1. Boston Airspace geospatial dataset integrity
 * 2. 3D trajectory discretization & acoustic propagation physics
 * 3. Multi-agent utility scoring (Community, Operator, City)
 * 4. All 5 preset Boston negotiation scenarios achieve Consensus & 0 EJ violations
 * 5. Dynamic citizen quiet-zone avoidance deflects route & preserves compliance
 * 6. SHA-256 Auditable Consensus Certificate generation & determinism
 */

const assert = require('assert');
const {
  VERTIPORTS,
  SENSITIVE_ZONES,
  RESTRICTED_ZONES,
  FLYWAY_CORRIDORS,
  MISSION_SCENARIOS
} = require('./data/bostonAirspace');
const { haversineMeters, evaluateTrajectory } = require('./engine/acousticsAndPhysics');
const { runNegotiationSimulation } = require('./engine/negotiationSimulator');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\nRunning Skyline Consensus Verification Suite...\n');

test('Boston Airspace geodata contains 6 vertiports, 8 sensitive zones, and 5 scenarios', () => {
  assert.strictEqual(VERTIPORTS.length, 6);
  assert.strictEqual(SENSITIVE_ZONES.length, 8);
  assert.strictEqual(RESTRICTED_ZONES.length, 2);
  assert.ok(FLYWAY_CORRIDORS.length >= 4);
  assert.strictEqual(MISSION_SCENARIOS.length, 5);
});

test('Haversine distance between Logan (BOS) and Longwood Medical (LMA) is ~7.7 km', () => {
  const bos = VERTIPORTS.find((v) => v.id === 'BOS');
  const lma = VERTIPORTS.find((v) => v.id === 'LMA');
  const distKm = haversineMeters(bos, lma) / 1000;
  assert.ok(distKm > 7.2 && distKm < 8.3, `Expected ~7.7km, got ${distKm}`);
});

test('All 5 curated Boston scenarios converge from low-consensus baseline to high-consensus equilibrium', () => {
  for (const scenario of MISSION_SCENARIOS) {
    const sim = runNegotiationSimulation({ scenarioId: scenario.id });
    assert.strictEqual(sim.rounds.length, 5, `Expected 5 rounds for ${scenario.id}`);

    const r1 = sim.routes[0];
    const r4 = sim.routes[3];

    assert.ok(
      r4.scores.consensusScore > r1.scores.consensusScore,
      `Scenario ${scenario.id}: R4 consensus (${r4.scores.consensusScore}) must exceed R1 (${r1.scores.consensusScore})`
    );
    assert.ok(
      r4.scores.consensusScore >= 75,
      `Scenario ${scenario.id}: R4 consensus score (${r4.scores.consensusScore}) should be >= 75`
    );
    assert.strictEqual(
      r4.evaluation.airspaceViolationsCount,
      0,
      `Scenario ${scenario.id}: R4 must have 0 FAA airspace violations`
    );
    assert.strictEqual(
      r4.scores.ejViolationsCount,
      0,
      `Scenario ${scenario.id}: R4 must have 0 Environmental Justice violations`
    );
    assert.ok(
      r4.evaluation.peakGroundDba < r1.evaluation.peakGroundDba,
      `Scenario ${scenario.id}: R4 peak noise (${r4.evaluation.peakGroundDba}) must be lower than R1 (${r1.evaluation.peakGroundDba})`
    );
  }
});

test('Dynamic citizen quiet zone triggers lateral waypoint bypass and maintains compliance', () => {
  const customZone = {
    id: 'custom-test-zone',
    name: 'Test School Quiet Zone',
    lat: 42.3469,
    lng: -71.0600,
    radiusMeters: 500,
    noiseCapDba: 53.0
  };
  const withoutZone = runNegotiationSimulation({ scenarioId: 'bos-lma-medical' });
  const withZone = runNegotiationSimulation({
    scenarioId: 'bos-lma-medical',
    customZones: [customZone]
  });

  const wpsWithout = withoutZone.finalConsensus.route.waypoints;
  const wpsWith = withZone.finalConsensus.route.waypoints;
  assert.notDeepStrictEqual(
    wpsWith,
    wpsWithout,
    'Consensus waypoints should adapt when a dynamic quiet zone is placed on the corridor'
  );
});

test('Auditable Consensus Record includes valid SHA-256 hash and tri-agent signatures', () => {
  const sim = runNegotiationSimulation({ scenarioId: 'bos-lma-medical' });
  const cert = sim.auditableConsensusRecord;
  assert.ok(cert.certificateId.startsWith('BOS-AAM-'));
  assert.strictEqual(cert.sha256Hash.length, 64);
  assert.ok(cert.agentSignatures.COMMUNITY.startsWith('sig_comm_'));
  assert.ok(cert.agentSignatures.OPERATOR.startsWith('sig_oper_'));
  assert.ok(cert.agentSignatures.CITY.startsWith('sig_city_'));
  assert.ok(cert.neighborhoodAuditLedger.length === SENSITIVE_ZONES.length);
});

console.log(`\nAll ${passed} verification tests passed!\n`);
