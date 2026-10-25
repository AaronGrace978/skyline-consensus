#!/usr/bin/env node
/**
 * Skyline Consensus — CLI Multi-Agent Negotiation Simulator
 *
 * Usage:
 *   npm run simulate
 *   node backend/cli.js --scenario bos-lma-medical
 *   node backend/cli.js --origin SBP --dest KSQ --time night
 */

const { MISSION_SCENARIOS } = require('./data/bostonAirspace');
const { runNegotiationSimulation } = require('./engine/negotiationSimulator');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--scenario' && argv[i + 1]) args.scenarioId = argv[++i];
    else if (token === '--origin' && argv[i + 1]) args.originId = argv[++i].toUpperCase();
    else if (token === '--dest' && argv[i + 1]) args.destinationId = argv[++i].toUpperCase();
    else if (token === '--time' && argv[i + 1]) args.timeOfDay = argv[++i].toLowerCase();
    else if (token === '--weather' && argv[i + 1]) args.weather = argv[++i].toLowerCase();
    else if (token === '--all') args.runAll = true;
  }
  return args;
}

function printScenarioReport(result) {
  const { mission, rounds, comparison, auditableConsensusRecord } = result;
  const divider = '═'.repeat(78);
  const thin = '─'.repeat(78);

  console.log(`\n${divider}`);
  console.log(`  SKYLINE CONSENSUS — MULTI-AGENT eVTOL FLIGHT PATH NEGOTIATION`);
  console.log(`  "Don't pitch the future. Prove it's fair."`);
  console.log(divider);
  console.log(`  Mission    : ${mission.title}`);
  console.log(`  Subtitle   : ${mission.subtitle}`);
  console.log(`  Corridor   : ${mission.origin.name} (${mission.origin.code}) -> ${mission.destination.name} (${mission.destination.code})`);
  console.log(`  Conditions : Time=${mission.timeOfDay.toUpperCase()} | Weather=${mission.weather.toUpperCase()} | Aircraft=${mission.aircraftModel}`);
  console.log(thin);

  for (const round of rounds) {
    console.log(
      `\n  [ROUND ${round.round}] ${round.title} (${round.status})`
    );
    console.log(
      `  Utilities -> Community: ${round.scores.communityUtility}/100 | Operator: ${round.scores.operatorUtility}/100 | City: ${round.scores.cityUtility}/100 | Consensus Score: ${round.scores.consensusScore}/100`
    );
    for (const msg of round.messages) {
      console.log(`    • [${msg.agentId.padEnd(9)}] (${msg.action}): ${msg.headline}`);
    }
  }

  console.log(`\n${thin}`);
  console.log(`  AUDITABLE IMPACT PROOF (Unnegotiated Direct R1 vs. Skyline Consensus R4)`);
  console.log(thin);
  console.log(
    `  • Peak Ground Noise       : ${comparison.peakGroundDba.baseline} dBA -> ${comparison.peakGroundDba.consensus} dBA (${comparison.peakGroundDba.delta} dBA / -${comparison.peakGroundDba.acousticEnergyReductionPct}% acoustic energy)`
  );
  console.log(
    `  • EJ Residents Protected  : ${comparison.ejExposedPopulation.baseline.toLocaleString()} exposed -> ${comparison.ejExposedPopulation.consensus.toLocaleString()} exposed (${comparison.ejExposedPopulation.residentsProtected.toLocaleString()} residents protected)`
  );
  console.log(
    `  • Jain's Fairness Index   : ${comparison.jainsFairnessIndex.baseline} -> ${comparison.jainsFairnessIndex.consensus} (+${comparison.jainsFairnessIndex.delta})`
  );
  console.log(
    `  • Route Distance & Time   : ${comparison.distanceKm.baseline} km (${comparison.flightTimeMin.baseline} min) -> ${comparison.distanceKm.consensus} km (${comparison.flightTimeMin.consensus} min)`
  );
  console.log(
    `  • Battery Energy Draw     : ${comparison.energyKwh.baseline} kWh -> ${comparison.energyKwh.consensus} kWh (+${comparison.energyKwh.pctChange}%)`
  );
  console.log(
    `  • Skyline Consensus Score : ${comparison.consensusScore.baseline}/100 -> ${comparison.consensusScore.consensus}/100 (+${comparison.consensusScore.delta} pts)`
  );
  console.log(thin);
  console.log(`  Certificate ID : ${auditableConsensusRecord.certificateId}`);
  console.log(`  SHA-256 Proof  : 0x${auditableConsensusRecord.sha256Hash}`);
  console.log(
    `  Signatures     : COMM=${auditableConsensusRecord.agentSignatures.COMMUNITY} | OPER=${auditableConsensusRecord.agentSignatures.OPERATOR} | CITY=${auditableConsensusRecord.agentSignatures.CITY}`
  );
  console.log(`${divider}\n`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.runAll) {
    for (const sc of MISSION_SCENARIOS) {
      const res = runNegotiationSimulation({ scenarioId: sc.id });
      printScenarioReport(res);
    }
  } else {
    const res = runNegotiationSimulation({
      scenarioId: args.scenarioId || (!args.originId ? 'bos-lma-medical' : undefined),
      originId: args.originId,
      destinationId: args.destinationId,
      timeOfDay: args.timeOfDay,
      weather: args.weather
    });
    printScenarioReport(res);
  }
}

if (require.main === module) {
  main();
}

module.exports = { printScenarioReport };
