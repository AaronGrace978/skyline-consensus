/**
 * Skyline Consensus — Express API & Web Application Server
 *
 * Serves:
 *  - Interactive Boston eVTOL Negotiation Web Demo (/)
 *  - GET  /api/health
 *  - GET  /api/airspace
 *  - GET  /api/negotiate
 *  - POST /api/negotiate
 *  - POST /api/evaluate-route
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

const {
  VERTIPORTS,
  SENSITIVE_ZONES,
  RESTRICTED_ZONES,
  FLYWAY_CORRIDORS,
  MISSION_SCENARIOS
} = require('./backend/data/bostonAirspace');
const { evaluateTrajectory } = require('./backend/engine/acousticsAndPhysics');
const { AGENT_PROFILES, scoreAllAgents } = require('./backend/engine/agents');
const { runNegotiationSimulation } = require('./backend/engine/negotiationSimulator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Skyline Consensus Multi-Agent eVTOL Negotiation Engine',
    protocolVersion: 'SKYLINE-CONSENSUS-v1.4-BOS',
    vertiportsCount: VERTIPORTS.length,
    sensitiveZonesCount: SENSITIVE_ZONES.length,
    scenariosCount: MISSION_SCENARIOS.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/airspace', (_req, res) => {
  res.json({
    city: 'Greater Boston, Massachusetts',
    center: { lat: 42.3601, lng: -71.0589 },
    agents: AGENT_PROFILES,
    vertiports: VERTIPORTS,
    sensitiveZones: SENSITIVE_ZONES,
    restrictedZones: RESTRICTED_ZONES,
    flywayCorridors: FLYWAY_CORRIDORS,
    scenarios: MISSION_SCENARIOS
  });
});

app.get('/api/negotiate', (req, res) => {
  try {
    const result = runNegotiationSimulation({
      scenarioId: req.query.scenarioId,
      originId: req.query.originId,
      destinationId: req.query.destinationId,
      timeOfDay: req.query.timeOfDay,
      weather: req.query.weather
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/negotiate', (req, res) => {
  try {
    const body = req.body || {};
    const result = runNegotiationSimulation({
      scenarioId: body.scenarioId,
      originId: body.originId,
      destinationId: body.destinationId,
      timeOfDay: body.timeOfDay,
      weather: body.weather,
      weights: body.weights,
      customZones: body.customZones
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/evaluate-route', (req, res) => {
  try {
    const { waypoints, timeOfDay, weather, quietRotorMode, weights, customZones } = req.body || {};
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: 'At least 2 waypoints are required.' });
    }
    const evaluation = evaluateTrajectory(waypoints, {
      timeOfDay,
      weather,
      quietRotorMode,
      customZones
    });
    const scores = scoreAllAgents(evaluation, { timeOfDay, weather, weights });
    return res.json({ evaluation, scores });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `\n✈️  Skyline Consensus Server running at http://localhost:${PORT}`
    );
    console.log(
      `   • Web Demo : http://localhost:${PORT}`
    );
    console.log(
      `   • Airspace : http://localhost:${PORT}/api/airspace`
    );
    console.log(
      `   • Simulate : POST http://localhost:${PORT}/api/negotiate\n`
    );
  });
}

module.exports = app;
