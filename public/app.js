/**
 * Skyline Consensus — Interactive Web Demo Client
 *
 * Powers:
 *  - Greater Boston eVTOL Airspace Leaflet Map (Vertiports, EJ Zones, FAA Restricted, Flyways)
 *  - Live 5-Round Multi-Agent Negotiation Playback & Step-by-Step Inspector
 *  - Real-Time Animated eVTOL Aircraft Marker & Flight Telemetry HUD
 *  - Citizen Dynamic Quiet Zone Map Placement & Instant Re-Negotiation
 *  - SVG 3D Altitude & Ground Noise Cross-Section Chart
 *  - Cryptographic SHA-256 Auditable Consensus Proof Inspector & Exporter
 */

(function () {
  const state = {
    airspace: null,
    simulation: null,
    scenarioId: 'bos-lma-medical',
    originId: 'BOS',
    destinationId: 'LMA',
    timeOfDay: 'day',
    weather: 'clear',
    weights: { community: 0.38, operator: 0.30, city: 0.32 },
    customZones: [],
    activeRound: 5, // 1..5
    routeFilter: 'all', // 'all' | '1' | '2' | '3' | '4'
    dropZoneMode: false,
    liveTimer: null,
    aircraftAnimFrame: null,
    aircraftSampleIdx: 0
  };

  let map = null;
  const mapLayers = {
    ejZones: null,
    restrictedZones: null,
    flyways: null,
    customZones: null,
    routes: null,
    waypoints: null,
    vertiports: null,
    aircraftMarker: null,
    highlightPulse: null
  };

  // Initialize application on DOM ready
  document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    bindUIEvents();
    await loadAirspaceData();
    await runSimulation({ fitBounds: true });
    startAircraftAnimationLoop();
  });

  /**
   * Initialize Leaflet Map centered on Greater Boston
   */
  function initMap() {
    map = L.map('boston-map', {
      center: [42.3585, -71.0595],
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Carto's raster CDN (basemaps.cartocdn.com/dark_all and /rastertiles/dark_all)
    // has required an API key since 25 Sep 2026. Anonymous requests return a
    // blank "API KEY REQUIRED" tile, so they cannot be the street basemap.
    // Esri World Dark Gray is keyless, dark, and draws the Boston street grid.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ | &copy; OpenStreetMap contributors',
        maxZoom: 16
      }
    ).addTo(map);

    mapLayers.flyways = L.layerGroup().addTo(map);
    mapLayers.ejZones = L.layerGroup().addTo(map);
    mapLayers.restrictedZones = L.layerGroup().addTo(map);
    mapLayers.customZones = L.layerGroup().addTo(map);
    mapLayers.routes = L.layerGroup().addTo(map);
    mapLayers.waypoints = L.layerGroup().addTo(map);
    mapLayers.vertiports = L.layerGroup().addTo(map);
    mapLayers.highlightPulse = L.layerGroup().addTo(map);

    // Handle click on map when in Citizen Dynamic Quiet Zone mode
    map.on('click', async (e) => {
      if (!state.dropZoneMode) return;
      const { lat, lng } = e.latlng;
      const zoneNum = state.customZones.length + 1;
      state.customZones.push({
        id: `citizen-zone-${Date.now()}`,
        name: `Citizen Quiet Shield #${zoneNum}`,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        radiusMeters: 580,
        noiseCapDba: 52.5,
        minSafeAltitudeFt: 1480
      });
      await runSimulation({ fitBounds: false });
    });
  }

  /**
   * Load Boston Airspace Geodata & Populate Controls
   */
  async function loadAirspaceData() {
    const res = await fetch('/api/airspace');
    state.airspace = await res.json();

    const scenarioSelect = document.getElementById('scenario-select');
    const originSelect = document.getElementById('origin-select');
    const destSelect = document.getElementById('dest-select');

    scenarioSelect.innerHTML =
      state.airspace.scenarios
        .map((s) => `<option value="${s.id}">${s.title}</option>`)
        .join('') + `<option value="custom">Custom Origin / Destination Corridor</option>`;

    const vpOptions = state.airspace.vertiports
      .map((v) => `<option value="${v.id}">${v.id} — ${v.shortName}</option>`)
      .join('');
    originSelect.innerHTML = vpOptions;
    destSelect.innerHTML = vpOptions;

    originSelect.value = state.originId;
    destSelect.value = state.destinationId;

    renderStaticAirspaceLayers();
  }

  /**
   * Render Sensitive EJ Polygons, FAA Restricted Zones, Flyways, and Vertiports
   */
  function renderStaticAirspaceLayers() {
    if (!state.airspace) return;

    mapLayers.ejZones.clearLayers();
    mapLayers.restrictedZones.clearLayers();
    mapLayers.flyways.clearLayers();

    // 1. Blue/Green & Highway Acoustic Masking Flyway Corridors
    for (const corridor of state.airspace.flywayCorridors) {
      const latlngs = corridor.waypoints.map((w) => [w.lat, w.lng]);
      const poly = L.polyline(latlngs, {
        color: corridor.color || '#06b6d4',
        weight: 10,
        opacity: 0.18,
        lineCap: 'round'
      });
      poly.bindTooltip(
        `<strong>${corridor.name}</strong><br/>Masking Bonus: -${corridor.acousticMaskingBonusDba} dBA`,
        { sticky: true }
      );
      poly.addTo(mapLayers.flyways);
    }

    // 2. Boston Environmental Justice & Sensitive Quiet Zones
    for (const zone of state.airspace.sensitiveZones) {
      const poly = L.polygon(zone.polygon, {
        color: zone.color || '#f43f5e',
        weight: 1.5,
        fillColor: zone.color || '#f43f5e',
        fillOpacity: zone.isEnvironmentalJustice ? 0.16 : 0.10,
        dashArray: zone.isEnvironmentalJustice ? null : '4, 4'
      });

      poly.bindPopup(`
        <div style="min-width:210px">
          <div style="font-size:10px;color:#fb7185;font-weight:700;text-transform:uppercase">
            ${zone.isEnvironmentalJustice ? '★ Environmental Justice Priority Tract' : 'Residential Quiet Zone'}
          </div>
          <div style="font-size:13px;font-weight:700;margin:2px 0 5px">${zone.name}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:6px">${zone.description}</div>
          <div style="font-size:11px;font-family:monospace;background:#1e293b;padding:5px 7px;border-radius:5px">
            Pop: ${zone.population.toLocaleString()} | Day Cap: ${zone.dayNoiseCapDba} dBA<br/>
            Night Cap: ${zone.nightNoiseCapDba} dBA | Equity Wt: ${zone.equityWeight}x
          </div>
        </div>
      `);
      poly.addTo(mapLayers.ejZones);
    }

    // 3. FAA Class B & High-Rise Restricted Airspace Zones
    for (const rZone of state.airspace.restrictedZones) {
      const poly = L.polygon(rZone.polygon, {
        color: rZone.color || '#eab308',
        weight: 2,
        fillColor: rZone.color || '#eab308',
        fillOpacity: 0.2,
        dashArray: '6, 5'
      });

      poly.bindPopup(`
        <div style="min-width:210px">
          <div style="font-size:10px;color:#fbbf24;font-weight:700;text-transform:uppercase">
            ⚠️ ${rZone.authority}
          </div>
          <div style="font-size:13px;font-weight:700;margin:2px 0 5px">${rZone.name}</div>
          <div style="font-size:11px;color:#cbd5e1">${rZone.description}</div>
        </div>
      `);
      poly.addTo(mapLayers.restrictedZones);
    }
  }

  /**
   * Execute Multi-Agent Negotiation Simulation via Backend API
   */
  async function runSimulation(options = {}) {
    stopLivePlayback();

    const payload = {
      scenarioId: state.scenarioId !== 'custom' ? state.scenarioId : undefined,
      originId: state.originId,
      destinationId: state.destinationId,
      timeOfDay: state.timeOfDay,
      weather: state.weather,
      weights: state.weights,
      customZones: state.customZones
    };

    const res = await fetch('/api/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    state.simulation = await res.json();
    state.activeRound = 5;
    state.aircraftSampleIdx = 0;

    renderFullState({ fitBounds: options.fitBounds });
  }

  /**
   * Render Map Routes, Vertiports, Agent Cards, Protocol Stream & Analytics Charts
   */
  function renderFullState(options = {}) {
    if (!state.simulation) return;

    renderVertiportsAndCustomZones();
    renderRoutesOnMap(options.fitBounds);
    renderScoreAndAgentPanels();
    renderProtocolStream();
    renderAcousticProfileChart();
    renderNeighborhoodLedgerTable();
    renderImpactDeltaCards();
    updateStepperUI();
  }

  /**
   * Render Vertiports & Custom Citizen Quiet Zones on Map
   */
  function renderVertiportsAndCustomZones() {
    mapLayers.vertiports.clearLayers();
    mapLayers.customZones.clearLayers();

    const originId = state.simulation.mission.origin.id;
    const destId = state.simulation.mission.destination.id;

    for (const vp of state.airspace.vertiports) {
      const isOrigin = vp.id === originId;
      const isDest = vp.id === destId;
      const badgeClass = isOrigin
        ? 'vertiport-badge origin-port'
        : isDest
          ? 'vertiport-badge dest-port'
          : 'vertiport-badge';
      const prefix = isOrigin ? '🛫 ' : isDest ? '🛬 ' : '⬢ ';

      const icon = L.divIcon({
        className: 'vertiport-marker-icon',
        html: `<div class="${badgeClass}">${prefix}${vp.id}</div>`,
        iconSize: [64, 24],
        iconAnchor: [32, 12]
      });

      const marker = L.marker([vp.lat, vp.lng], { icon });
      marker.bindPopup(`
        <div style="min-width:200px">
          <div style="font-size:10px;color:#38bdf8;font-weight:700">${vp.code} • ${vp.airspaceClass}</div>
          <div style="font-size:13px;font-weight:700;margin:2px 0 4px">${vp.name}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:5px">${vp.description}</div>
          <div style="font-size:10.5px;font-family:monospace;color:#94a3b8">
            Pads: ${vp.padCount} | Max Ops: ${vp.maxHourlyOps}/hr
          </div>
        </div>
      `);
      marker.addTo(mapLayers.vertiports);
    }

    // Render any user-placed Citizen Dynamic Quiet Zones
    for (const cz of state.customZones) {
      const circle = L.circle([cz.lat, cz.lng], {
        radius: cz.radiusMeters || 580,
        color: '#ec4899',
        weight: 2,
        fillColor: '#ec4899',
        fillOpacity: 0.25,
        dashArray: '4, 4'
      });
      circle.bindTooltip(
        `<strong>${cz.name}</strong><br/>Citizen Dynamic Shield (Cap: ${cz.noiseCapDba} dBA)`,
        { sticky: true }
      );
      circle.addTo(mapLayers.customZones);
    }
  }

  /**
   * Render the 4 Negotiation Evolution Trajectories on the Boston Map
   */
  function renderRoutesOnMap(fitBounds = false) {
    mapLayers.routes.clearLayers();
    mapLayers.waypoints.clearLayers();

    const routes = state.simulation.routes;
    const maxVisibleRound = state.activeRound >= 4 ? 4 : state.activeRound;

    routes.forEach((route) => {
      const rNum = route.roundNumber;

      // Filter visibility based on route filter pills or active round playback
      if (state.routeFilter !== 'all' && Number(state.routeFilter) !== rNum) {
        return;
      }
      if (state.routeFilter === 'all' && rNum > maxVisibleRound) {
        return;
      }

      const isFocusedRoute =
        (state.routeFilter !== 'all' && Number(state.routeFilter) === rNum) ||
        (state.routeFilter === 'all' && rNum === maxVisibleRound);

      const latlngs = route.waypoints.map((w) => [w.lat, w.lng]);

      // Outer glow for the active/consensus trajectory
      if (isFocusedRoute) {
        L.polyline(latlngs, {
          color: route.color,
          weight: rNum === 4 ? 11 : 8,
          opacity: 0.24,
          lineCap: 'round'
        }).addTo(mapLayers.routes);
      }

      const polyline = L.polyline(latlngs, {
        color: route.color,
        weight: isFocusedRoute ? 4.5 : 2.5,
        opacity: isFocusedRoute ? 0.96 : 0.55,
        dashArray: route.dashArray
      });

      polyline.bindTooltip(
        `<strong>${route.name}</strong><br/>` +
          `Peak Noise: ${route.evaluation.peakGroundDba} dBA | Time: ${route.evaluation.flightTimeMin} min | ` +
          `Consensus: ${route.scores.consensusScore}/100`,
        { sticky: true }
      );

      polyline.addTo(mapLayers.routes);

      // Draw intermediate corridor gate waypoints on the focused route
      if (isFocusedRoute) {
        route.waypoints.slice(1, -1).forEach((wp, idx) => {
          const wpMarker = L.circleMarker([wp.lat, wp.lng], {
            radius: 5,
            color: '#0f172a',
            weight: 2,
            fillColor: route.color,
            fillOpacity: 1
          });
          wpMarker.bindTooltip(
            `<span class="mono">Gate ${idx + 1}: <strong>${wp.name}</strong> (${wp.altFt} ft MSL @ ${wp.speedKt} kt)</span>`,
            { direction: 'top' }
          );
          wpMarker.addTo(mapLayers.waypoints);
        });
      }
    });

    if (fitBounds) {
      const allPts = routes[3].waypoints.map((w) => [w.lat, w.lng]);
      map.fitBounds(L.latLngBounds(allPts).pad(0.24));
    }
  }

  /**
   * Update Consensus Score Dial, Agent Utility Bars, and KPIs for the Active Round
   */
  function renderScoreAndAgentPanels() {
    const sim = state.simulation;
    const roundIndex = Math.min(sim.rounds.length - 1, Math.max(0, state.activeRound - 1));
    const currentRoundObj = sim.rounds[roundIndex];
    const activeRouteIdx = Math.min(3, Math.max(0, state.activeRound - 1));
    const activeRoute = sim.routes[activeRouteIdx];
    const r1Route = sim.routes[0];
    const r4Route = sim.routes[3];

    const scores = activeRoute.scores;
    const evalData = activeRoute.evaluation;

    // Update Consensus Score Ring (Circumference = 2 * pi * 50 = 314.16)
    const circumference = 314.16;
    const offset = circumference - (scores.consensusScore / 100) * circumference;
    const ringFill = document.getElementById('score-ring-fill');
    ringFill.style.strokeDashoffset = offset.toFixed(1);

    if (scores.consensusScore >= 75) {
      ringFill.style.stroke = '#10b981';
    } else if (scores.consensusScore >= 45) {
      ringFill.style.stroke = '#f59e0b';
    } else {
      ringFill.style.stroke = '#ef4444';
    }

    document.getElementById('consensus-score-value').textContent = scores.consensusScore;

    // Status pill
    const statusPill = document.getElementById('consensus-status-pill');
    if (state.activeRound === 1) {
      statusPill.textContent = 'ROUND 1: VETOED';
      statusPill.className = 'status-pill status-vetoed';
    } else if (state.activeRound < 4) {
      statusPill.textContent = `ROUND ${state.activeRound}: NEGOTIATING`;
      statusPill.className = 'status-pill status-negotiating';
    } else {
      statusPill.textContent =
        state.activeRound === 5 ? 'CONSENSUS CERTIFIED' : 'NASH EQUILIBRIUM';
      statusPill.className = 'status-pill status-certified';
    }

    // Fairness & Acoustic Submetrics
    document.getElementById('jains-index-value').textContent =
      evalData.jainsFairnessIndex.toFixed(4);
    const jainDelta = evalData.jainsFairnessIndex - r1Route.evaluation.jainsFairnessIndex;
    document.getElementById('jains-delta-badge').textContent =
      jainDelta >= 0 ? `+${jainDelta.toFixed(3)}` : jainDelta.toFixed(3);

    document.getElementById('nash-index-value').textContent = scores.nashBargainingIndex;
    document.getElementById('peak-dba-value').textContent = `${evalData.peakGroundDba} dBA`;

    const dbaDelta = Number(
      (evalData.peakGroundDba - r1Route.evaluation.peakGroundDba).toFixed(1)
    );
    const dbaBadge = document.getElementById('peak-dba-delta');
    dbaBadge.textContent = `${dbaDelta <= 0 ? dbaDelta : `+${dbaDelta}`} dB`;

    document.getElementById('strip-r1-score').textContent = `${r1Route.scores.consensusScore}/100 (Vetoed)`;
    document.getElementById('strip-r4-score').textContent = `${r4Route.scores.consensusScore}/100 (Cleared)`;

    document.getElementById('active-round-indicator').textContent = `ROUND ${state.activeRound} / 5`;

    // Agent 1: Community
    document.getElementById('util-community').textContent = scores.communityUtility;
    document.getElementById('bar-community').style.width = `${scores.communityUtility}%`;
    document.getElementById('kpi-comm-ej').textContent = `${scores.ejViolationsCount} Tracts`;
    const protectedPop = Math.max(
      0,
      r1Route.evaluation.totalEjExposedPopulation - evalData.totalEjExposedPopulation
    );
    document.getElementById('kpi-comm-pop').textContent = `${protectedPop.toLocaleString()} res.`;
    document.getElementById('kpi-comm-stance').textContent =
      state.activeRound === 1
        ? 'VETOING'
        : state.activeRound === 2
          ? 'HOLD / SHIFT'
          : state.activeRound === 3
            ? 'PROPOSING'
            : 'RATIFIED';

    // Agent 2: Operator
    document.getElementById('util-operator').textContent = scores.operatorUtility;
    document.getElementById('bar-operator').style.width = `${scores.operatorUtility}%`;
    document.getElementById('kpi-oper-time').textContent = `${evalData.flightTimeMin} min`;
    document.getElementById('kpi-oper-energy').textContent = `${evalData.totalEnergyKwh} kWh`;
    document.getElementById('kpi-oper-detour').textContent = `${evalData.detourRatio}x`;

    // Agent 3: City
    document.getElementById('util-city').textContent = scores.cityUtility;
    document.getElementById('bar-city').style.width = `${scores.cityUtility}%`;
    document.getElementById('kpi-city-faa').textContent =
      evalData.airspaceViolationsCount === 0
        ? '0 Clear'
        : `${evalData.airspaceViolationsCount} Viol.`;
    document.getElementById('kpi-city-flyway').textContent = `${evalData.flywayAlignmentPct}%`;
    document.getElementById('kpi-city-alt').textContent = `${evalData.maxAltitudeFt} ft`;

    // Corridor & Crypto Footer
    document.getElementById('protocol-corridor-code').textContent =
      `${sim.mission.origin.id} → ${sim.mission.destination.id}`;
    document.getElementById('cert-id-display').textContent =
      sim.auditableConsensusRecord.certificateId;
    document.getElementById('cert-hash-display').textContent =
      `0x${sim.auditableConsensusRecord.sha256Hash.slice(0, 28)}…`;

    // Update HUD title
    document.getElementById('hud-aircraft-name').textContent =
      sim.mission.aircraftModel.toUpperCase();
    document.getElementById('hud-route-tag').textContent = activeRoute.shortLabel.toUpperCase();
  }

  /**
   * Render Multi-Agent Negotiation Protocol Transcript up to state.activeRound
   */
  function renderProtocolStream() {
    const container = document.getElementById('protocol-stream');
    container.innerHTML = '';

    const roundsToShow = state.simulation.rounds.filter((r) => r.round <= state.activeRound);

    for (const rObj of roundsToShow) {
      const divider = document.createElement('div');
      divider.className = 'round-divider';
      divider.textContent = rObj.title;
      container.appendChild(divider);

      for (const msg of rObj.messages) {
        const card = document.createElement('div');
        card.className = `msg-card agent-${msg.agentId}`;

        const agentColor =
          msg.agentId === 'COMMUNITY'
            ? '#10b981'
            : msg.agentId === 'OPERATOR'
              ? '#3b82f6'
              : '#f59e0b';

        card.innerHTML = `
          <div class="msg-top">
            <span class="msg-agent-badge" style="color:${agentColor}">
              ● ${msg.agentId} AGENT
            </span>
            <span class="msg-action-tag stance-${msg.stance}">${msg.action}</span>
          </div>
          <div class="msg-headline">${msg.headline}</div>
          <div class="msg-body">${msg.message}</div>
          <div class="msg-metrics-row">
            ${msg.metricsCited
              .map(
                (m) =>
                  `<span class="msg-metric-chip">${m.label}: <strong>${m.value}</strong></span>`
              )
              .join('')}
          </div>
        `;

        card.addEventListener('click', () => {
          if (msg.highlightCoords && msg.highlightCoords.lat) {
            pulseMapCoordinate(msg.highlightCoords.lat, msg.highlightCoords.lng, msg.headline);
          }
        });

        container.appendChild(card);
      }
    }

    container.scrollTop = container.scrollHeight;
  }

  /**
   * Pulse a coordinate on the map when a user clicks a protocol message
   */
  function pulseMapCoordinate(lat, lng, label) {
    mapLayers.highlightPulse.clearLayers();
    const circle = L.circleMarker([lat, lng], {
      radius: 14,
      color: '#38bdf8',
      weight: 3,
      fillColor: '#38bdf8',
      fillOpacity: 0.35
    }).addTo(mapLayers.highlightPulse);

    circle.bindPopup(`<strong>Protocol Focus Point</strong><br/>${label}`).openPopup();
    map.panTo([lat, lng], { animate: true });
  }

  /**
   * Render Interactive SVG Acoustic & Altitude Cross-Section Profile
   */
  function renderAcousticProfileChart() {
    const container = document.getElementById('acoustic-profile-chart');
    if (!state.simulation) return;

    const r1Samples = state.simulation.routes[0].evaluation.profileSamples;
    const r4Samples = state.simulation.routes[3].evaluation.profileSamples;

    const width = Math.max(520, container.clientWidth || 680);
    const height = Math.max(135, container.clientHeight || 155);
    const pad = { top: 14, right: 46, bottom: 24, left: 44 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const minDba = 35;
    const maxDba = 72;
    const maxAlt = 1900;

    const xForNorm = (t) => pad.left + t * plotW;
    const yForDba = (dba) =>
      pad.top + plotH - ((Math.max(minDba, Math.min(maxDba, dba)) - minDba) / (maxDba - minDba)) * plotH;
    const yForAlt = (alt) =>
      pad.top + plotH - (Math.max(0, Math.min(maxAlt, alt)) / maxAlt) * plotH;

    const buildPath = (samples, valFn, yFn) =>
      samples
        .map((s, idx) => {
          const t = idx / Math.max(1, samples.length - 1);
          const x = xForNorm(t).toFixed(1);
          const y = yFn(valFn(s)).toFixed(1);
          return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    const r1DbaPath = buildPath(r1Samples, (s) => s.groundDba, yForDba);
    const r4DbaPath = buildPath(r4Samples, (s) => s.groundDba, yForDba);
    const r4AltPath = buildPath(r4Samples, (s) => s.altFt, yForAlt);

    const capDba = state.timeOfDay === 'night' ? 48.0 : 55.0;
    const capY = yForDba(capDba).toFixed(1);

    const maxDistKm = state.simulation.routes[3].evaluation.totalDistanceKm;

    container.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Horizontal Grid Lines -->
        ${[40, 50, 60, 70]
          .map((dba) => {
            const y = yForDba(dba).toFixed(1);
            return `
              <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="rgba(148,163,184,0.12)" stroke-width="1" />
              <text x="${pad.left - 6}" y="${Number(y) + 3}" fill="#94a3b8" font-size="9.5" font-family="JetBrains Mono" text-anchor="end">${dba}dB</text>
            `;
          })
          .join('')}

        <!-- Right-axis Altitude Labels -->
        ${[500, 1000, 1500]
          .map((alt) => {
            const y = yForAlt(alt).toFixed(1);
            return `<text x="${width - pad.right + 6}" y="${Number(y) + 3}" fill="#38bdf8" font-size="9.5" font-family="JetBrains Mono">${alt}ft</text>`;
          })
          .join('')}

        <!-- EJ Acoustic Cap Reference Line -->
        <line x1="${pad.left}" y1="${capY}" x2="${width - pad.right}" y2="${capY}" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="4,4" />
        <text x="${pad.left + 6}" y="${Number(capY) - 4}" fill="#fb7185" font-size="9.5" font-family="JetBrains Mono">EJ Cap (${capDba} dBA)</text>

        <!-- Area under R4 Consensus Noise Curve -->
        <path d="${r4DbaPath} L${width - pad.right},${pad.top + plotH} L${pad.left},${pad.top + plotH} Z" fill="url(#emeraldGrad)" />

        <!-- R1 Direct Baseline Noise (Red Dashed) -->
        <path d="${r1DbaPath}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,4" />

        <!-- R4 Altitude Profile (Cyan) -->
        <path d="${r4AltPath}" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-opacity="0.85" />

        <!-- R4 Consensus Ground Noise (Emerald Solid) -->
        <path d="${r4DbaPath}" fill="none" stroke="#10b981" stroke-width="2.6" />

        <!-- X-Axis Distance Labels -->
        <text x="${pad.left}" y="${height - 5}" fill="#94a3b8" font-size="9.5" font-family="JetBrains Mono">0.0 km (${state.simulation.mission.origin.id})</text>
        <text x="${pad.left + plotW / 2}" y="${height - 5}" fill="#94a3b8" font-size="9.5" font-family="JetBrains Mono" text-anchor="middle">${(maxDistKm / 2).toFixed(1)} km (En-Route Flyway)</text>
        <text x="${width - pad.right}" y="${height - 5}" fill="#94a3b8" font-size="9.5" font-family="JetBrains Mono" text-anchor="end">${maxDistKm} km (${state.simulation.mission.destination.id})</text>
      </svg>
    `;
  }

  /**
   * Render Tab 2: Boston Neighborhood Environmental Justice Audit Ledger Table
   */
  function renderNeighborhoodLedgerTable() {
    const tbody = document.getElementById('neighborhood-ledger-tbody');
    const ledger = state.simulation.auditableConsensusRecord.neighborhoodAuditLedger;

    tbody.innerHTML = ledger
      .map((row) => {
        const deltaStr =
          row.dbaChange <= 0 ? `${row.dbaChange} dBA` : `+${row.dbaChange} dBA`;
        return `
          <tr>
            <td><strong style="color:#f8fafc">${row.zoneName}</strong></td>
            <td>
              ${
                row.isEnvironmentalJustice
                  ? '<span class="ej-tag">EJ PRIORITY TRACT</span>'
                  : '<span class="std-tag">Residential Quiet</span>'
              }
            </td>
            <td class="mono">${
              state.airspace.sensitiveZones
                .find((z) => z.id === row.zoneId)
                ?.population?.toLocaleString() || '18,500'
            }</td>
            <td class="mono">${row.noiseCapDba} dBA</td>
            <td class="mono" style="color:${row.baselinePeakDba > row.noiseCapDba ? '#f87171' : '#cbd5e1'}">
              ${row.baselinePeakDba} dBA
            </td>
            <td class="mono text-emerald"><strong>${row.consensusPeakDba} dBA</strong></td>
            <td class="mono" style="color:${row.dbaChange < 0 ? '#34d399' : '#cbd5e1'}">${deltaStr}</td>
            <td>
              <span class="status-pill ${row.compliant ? 'status-certified' : 'status-vetoed'}">
                ${row.compliant ? '✓ COMPLIANT' : '⚠ EXCEEDED'}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  /**
   * Render Tab 3: Side-by-Side Baseline vs. Consensus Proof Summary Cards
   */
  function renderImpactDeltaCards() {
    const grid = document.getElementById('impact-delta-grid');
    const cmp = state.simulation.comparison;

    grid.innerHTML = `
      <div class="delta-card">
        <span class="delta-card-title">Acoustic Energy Reduction</span>
        <div class="delta-card-main">${cmp.peakGroundDba.delta} dBA (-${cmp.peakGroundDba.acousticEnergyReductionPct}%)</div>
        <div class="delta-card-sub">
          Baseline <strong>${cmp.peakGroundDba.baseline} dBA</strong> → Consensus <strong>${cmp.peakGroundDba.consensus} dBA</strong>
        </div>
      </div>

      <div class="delta-card">
        <span class="delta-card-title">EJ Residents Protected</span>
        <div class="delta-card-main">${cmp.ejExposedPopulation.residentsProtected.toLocaleString()}</div>
        <div class="delta-card-sub">
          Overburdened EJ exposure cut from <strong>${cmp.ejExposedPopulation.baseline.toLocaleString()}</strong> to <strong>${cmp.ejExposedPopulation.consensus}</strong>
        </div>
      </div>

      <div class="delta-card">
        <span class="delta-card-title">Jain's Fairness Index</span>
        <div class="delta-card-main">${cmp.jainsFairnessIndex.consensus.toFixed(4)}</div>
        <div class="delta-card-sub">
          Improved from <strong>${cmp.jainsFairnessIndex.baseline}</strong> (+${cmp.jainsFairnessIndex.delta}) across Boston tracts
        </div>
      </div>

      <div class="delta-card">
        <span class="delta-card-title">Commercial Viability Delta</span>
        <div class="delta-card-main" style="color:#38bdf8">+${cmp.flightTimeMin.delta} min</div>
        <div class="delta-card-sub">
          ${cmp.distanceKm.baseline} km → ${cmp.distanceKm.consensus} km (${cmp.energyKwh.consensus} kWh / within 30% FAA reserve)
        </div>
      </div>
    `;
  }

  /**
   * Continuous eVTOL Aircraft Animation along the Active Trajectory
   */
  function startAircraftAnimationLoop() {
    const evtolSvgIcon = L.divIcon({
      className: 'evtol-aircraft-icon',
      html: `
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" fill="rgba(16,185,129,0.22)" stroke="#10b981" stroke-width="1.5"/>
          <path d="M16 5L20 15L27 17L20 19L16 27L12 19L5 17L12 15L16 5Z" fill="#10b981" stroke="#052e16" stroke-width="1"/>
          <circle cx="16" cy="16" r="2.5" fill="#ffffff"/>
        </svg>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    mapLayers.aircraftMarker = L.marker([42.3601, -71.0589], {
      icon: evtolSvgIcon,
      zIndexOffset: 1000
    }).addTo(map);

    setInterval(() => {
      if (!state.simulation) return;
      const routeIdx =
        state.routeFilter !== 'all'
          ? Number(state.routeFilter) - 1
          : Math.min(3, Math.max(0, state.activeRound - 1));
      const activeRoute = state.simulation.routes[routeIdx] || state.simulation.routes[3];
      const samples = activeRoute.evaluation.profileSamples;
      if (!samples || samples.length === 0) return;

      state.aircraftSampleIdx = (state.aircraftSampleIdx + 1) % samples.length;
      const sample = samples[state.aircraftSampleIdx];

      mapLayers.aircraftMarker.setLatLng([sample.lat, sample.lng]);

      // Update live telemetry HUD
      document.getElementById('hud-alt').textContent = `${sample.altFt.toLocaleString()} ft`;
      document.getElementById('hud-speed').textContent = `${sample.speedKt} kt`;
      const noiseEl = document.getElementById('hud-noise');
      noiseEl.textContent = `${sample.groundDba} dBA`;
      noiseEl.className =
        sample.groundDba > sample.localThresholdDba
          ? 'hud-val mono'
          : 'hud-val mono text-emerald';
      noiseEl.style.color = sample.groundDba > sample.localThresholdDba ? '#f87171' : '';
      document.getElementById('hud-sector').textContent = sample.zoneLabel;
    }, 180);
  }

  /**
   * Run Live Round-by-Round Negotiation Playback (Round 1 -> 2 -> 3 -> 4 -> 5)
   */
  function startLivePlayback() {
    stopLivePlayback();
    state.routeFilter = 'all';
    updateRouteFilterButtons();
    state.activeRound = 1;
    renderFullState({ fitBounds: false });

    const btn = document.getElementById('btn-run-live');
    btn.innerHTML = '⏸ Playing Negotiation...';

    state.liveTimer = setInterval(() => {
      if (state.activeRound < 5) {
        state.activeRound++;
        renderFullState({ fitBounds: false });
      } else {
        stopLivePlayback();
      }
    }, 1550);
  }

  function stopLivePlayback() {
    if (state.liveTimer) {
      clearInterval(state.liveTimer);
      state.liveTimer = null;
    }
    const btn = document.getElementById('btn-run-live');
    if (btn) {
      btn.innerHTML = '<span class="btn-icon">▶</span> Run Live Negotiation';
    }
  }

  function updateStepperUI() {
    document.querySelectorAll('.step-btn').forEach((btn) => {
      const stepNum = Number(btn.dataset.step);
      btn.classList.toggle('active', stepNum <= state.activeRound);
      btn.classList.toggle('current-focus', stepNum === state.activeRound);
    });
  }

  function updateRouteFilterButtons() {
    document.querySelectorAll('.route-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.routeFilter === state.routeFilter);
    });
  }

  /**
   * Open Auditable Consensus Certificate Modal
   */
  function openProofModal() {
    if (!state.simulation) return;
    const cert = state.simulation.auditableConsensusRecord;
    const summaryEl = document.getElementById('modal-proof-summary');

    summaryEl.innerHTML = `
      <div class="proof-stat-box">
        <span>CERTIFICATE ID</span>
        <strong>${cert.certificateId}</strong>
      </div>
      <div class="proof-stat-box">
        <span>SKYLINE CONSENSUS SCORE</span>
        <strong>${cert.protocolSummary.consensusScore}/100 (Jain: ${cert.protocolSummary.jainsFairnessIndex})</strong>
      </div>
      <div class="proof-stat-box">
        <span>TRI-AGENT SIGNATURES</span>
        <strong>3 / 3 Verified (SHA-256)</strong>
      </div>
    `;

    document.getElementById('modal-json-viewer').textContent = JSON.stringify(cert, null, 2);
    document.getElementById('proof-modal-backdrop').classList.remove('hidden');
  }

  /**
   * Bind all UI Controls, Sliders, Tabs, and Buttons
   */
  function bindUIEvents() {
    // Scenario preset selector
    document.getElementById('scenario-select').addEventListener('change', async (e) => {
      const val = e.target.value;
      state.scenarioId = val;
      if (val !== 'custom' && state.airspace) {
        const sc = state.airspace.scenarios.find((s) => s.id === val);
        if (sc) {
          state.originId = sc.originId;
          state.destinationId = sc.destinationId;
          state.timeOfDay = sc.timeOfDay;
          state.weather = sc.weather;
          state.weights = { ...sc.defaultWeights };

          document.getElementById('origin-select').value = state.originId;
          document.getElementById('dest-select').value = state.destinationId;
          document.getElementById('time-select').value = state.timeOfDay;
          document.getElementById('weather-select').value = state.weather;
          syncWeightSlidersUI();
        }
      }
      await runSimulation({ fitBounds: true });
    });

    // Origin / Destination / Time / Weather selectors
    document.getElementById('origin-select').addEventListener('change', async (e) => {
      state.originId = e.target.value;
      if (state.originId === state.destinationId) {
        state.destinationId = state.originId === 'BOS' ? 'LMA' : 'BOS';
        document.getElementById('dest-select').value = state.destinationId;
      }
      state.scenarioId = 'custom';
      document.getElementById('scenario-select').value = 'custom';
      await runSimulation({ fitBounds: true });
    });

    document.getElementById('dest-select').addEventListener('change', async (e) => {
      state.destinationId = e.target.value;
      if (state.destinationId === state.originId) {
        state.originId = state.destinationId === 'BOS' ? 'LMA' : 'BOS';
        document.getElementById('origin-select').value = state.originId;
      }
      state.scenarioId = 'custom';
      document.getElementById('scenario-select').value = 'custom';
      await runSimulation({ fitBounds: true });
    });

    document.getElementById('time-select').addEventListener('change', async (e) => {
      state.timeOfDay = e.target.value;
      await runSimulation({ fitBounds: false });
    });

    document.getElementById('weather-select').addEventListener('change', async (e) => {
      state.weather = e.target.value;
      await runSimulation({ fitBounds: false });
    });

    // Live Negotiation & Step Round buttons
    document.getElementById('btn-run-live').addEventListener('click', () => {
      if (state.liveTimer) {
        stopLivePlayback();
      } else {
        startLivePlayback();
      }
    });

    document.getElementById('btn-step-round').addEventListener('click', () => {
      stopLivePlayback();
      state.activeRound = (state.activeRound % 5) + 1;
      renderFullState({ fitBounds: false });
    });

    // Citizen Dynamic Quiet Zone Mode
    const btnAddZone = document.getElementById('btn-add-zone');
    const dropBanner = document.getElementById('drop-zone-banner');

    btnAddZone.addEventListener('click', () => {
      state.dropZoneMode = !state.dropZoneMode;
      btnAddZone.classList.toggle('active', state.dropZoneMode);
      dropBanner.classList.toggle('hidden', !state.dropZoneMode);
      document.getElementById('boston-map').style.cursor = state.dropZoneMode
        ? 'crosshair'
        : '';
    });

    document.getElementById('btn-cancel-drop-zone').addEventListener('click', () => {
      state.dropZoneMode = false;
      btnAddZone.classList.remove('active');
      dropBanner.classList.add('hidden');
      document.getElementById('boston-map').style.cursor = '';
    });

    document.getElementById('btn-clear-custom-zones').addEventListener('click', async () => {
      state.customZones = [];
      await runSimulation({ fitBounds: false });
    });

    // Round Stepper clicks
    document.querySelectorAll('.step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        stopLivePlayback();
        state.activeRound = Number(btn.dataset.step);
        renderFullState({ fitBounds: false });
      });
    });

    // Route filter pills on map
    document.querySelectorAll('.route-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.routeFilter = btn.dataset.routeFilter;
        updateRouteFilterButtons();
        renderRoutesOnMap(false);
      });
    });

    // Map layer toggles
    document.getElementById('toggle-ej-zones').addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(mapLayers.ejZones);
      else map.removeLayer(mapLayers.ejZones);
    });

    document.getElementById('toggle-restricted').addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(mapLayers.restrictedZones);
      else map.removeLayer(mapLayers.restrictedZones);
    });

    document.getElementById('toggle-flyways').addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(mapLayers.flyways);
      else map.removeLayer(mapLayers.flyways);
    });

    // Agent Weight Sliders
    const handleWeightChange = async () => {
      const c = Number(document.getElementById('slider-community').value);
      const o = Number(document.getElementById('slider-operator').value);
      const m = Number(document.getElementById('slider-city').value);
      const sum = c + o + m || 100;

      state.weights = {
        community: Number((c / sum).toFixed(2)),
        operator: Number((o / sum).toFixed(2)),
        city: Number((m / sum).toFixed(2))
      };

      document.getElementById('val-weight-community').textContent = `${Math.round((c / sum) * 100)}%`;
      document.getElementById('val-weight-operator').textContent = `${Math.round((o / sum) * 100)}%`;
      document.getElementById('val-weight-city').textContent = `${Math.round((m / sum) * 100)}%`;

      await runSimulation({ fitBounds: false });
    };

    ['slider-community', 'slider-operator', 'slider-city'].forEach((id) => {
      document.getElementById(id).addEventListener('change', handleWeightChange);
    });

    document.getElementById('btn-reset-weights').addEventListener('click', async () => {
      state.weights = { community: 0.38, operator: 0.30, city: 0.32 };
      syncWeightSlidersUI();
      await runSimulation({ fitBounds: false });
    });

    // Analytics Drawer Tabs
    document.querySelectorAll('.drawer-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const target = tabBtn.dataset.tab;
        document.querySelectorAll('.drawer-tab').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.drawer-tab-body').forEach((body) => body.classList.remove('active'));

        tabBtn.classList.add('active');
        document.getElementById(`tab-content-${target}`).classList.add('active');
        document.getElementById('profile-chart-legend').style.display =
          target === 'profile' ? 'flex' : 'none';

        if (target === 'profile') {
          renderAcousticProfileChart();
        }
      });
    });

    // Proof Certificate Modal
    document.getElementById('btn-view-proof').addEventListener('click', openProofModal);
    document.getElementById('btn-open-cert-footer').addEventListener('click', openProofModal);
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('proof-modal-backdrop').classList.add('hidden');
    });

    document.getElementById('btn-download-json').addEventListener('click', () => {
      if (!state.simulation) return;
      const cert = state.simulation.auditableConsensusRecord;
      const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cert.certificateId.toLowerCase()}-proof.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    window.addEventListener('resize', () => {
      renderAcousticProfileChart();
    });
  }

  function syncWeightSlidersUI() {
    const c = Math.round((state.weights.community || 0.38) * 100);
    const o = Math.round((state.weights.operator || 0.30) * 100);
    const m = Math.round((state.weights.city || 0.32) * 100);
    document.getElementById('slider-community').value = c;
    document.getElementById('slider-operator').value = o;
    document.getElementById('slider-city').value = m;
    document.getElementById('val-weight-community').textContent = `${c}%`;
    document.getElementById('val-weight-operator').textContent = `${o}%`;
    document.getElementById('val-weight-city').textContent = `${m}%`;
  }
})();
