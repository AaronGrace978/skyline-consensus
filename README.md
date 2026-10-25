# Skyline Consensus

Multi-agent AI that negotiates fair eVTOL flight paths for Boston.

**HTCJ × PROOF Aviation Futures Challenge submission**

> Don't pitch the future. **Prove it's fair.**

## The Idea

Skyline Consensus is a multi-agent AI system where community, operator, and city agents negotiate eVTOL flight paths for Boston — and reach **auditable consensus**.

- **Community agents** — represent neighborhood concerns (acoustic ceilings, Environmental Justice protection, inter-neighborhood equity)
- **Operator agents** — represent eVTOL operators (battery kWh efficiency, flight duration, schedule viability, FAA reserve margins)
- **City agents** — represent Boston's regulations and infrastructure (FAA Logan Class B runway separation, skyscraper wind-shear buffers, autorotation reachability)
- Every negotiation produces an **auditable consensus record** — fairness isn't a promise, it's proof

---

## Quick Start

### Prerequisites
- **Node.js** `v18+` (tested with Node `v22`) and `npm`
- Zero external API keys or database setup required — all 3D trajectory physics, acoustic propagation, Nash bargaining, and geospatial geometry run out-of-the-box.

### 1. Install & Launch the Interactive Web Demo
```bash
npm install
npm start
```
Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Run the Multi-Agent Negotiation CLI Simulator
You can run the backend negotiation engine directly in your terminal across one or all preset Boston corridors:
```bash
# Run default scenario: Logan Airport (BOS) -> Longwood Medical Area (LMA)
npm run simulate

# Run all 5 Greater Boston scenarios with full telemetry & SHA-256 audit proofs
node backend/cli.js --all

# Run a custom corridor & condition from the CLI
node backend/cli.js --origin SBP --dest KSQ --time night --weather windy
```

### 3. Run the Automated Verification Test Suite
```bash
npm test
```

---

## What's Inside the Demo

1. **Interactive Greater Boston eVTOL Airspace Map (`public/app.js`)**
   - **6 Real Boston Vertiports:** Logan International (`BOS`), Longwood Medical Area (`LMA`), Kendall Square / MIT (`KSQ`), Seaport Waterfront (`SBP`), South Station / Back Bay (`BBY`), and Mystic / Assembly Regional Hub (`MHT`).
   - **8 Boston Environmental Justice (EJ) & Sensitive Neighborhood Polygons:** East Boston (Jeffries Point & Eagle Hill), South End & Boston Medical Center Quiet Zone, Roxbury / Nubian Square, Chinatown / Tufts Medical, Beacon Hill & Back Bay, North End & West End (MGH), Cambridgeport & Fenway, and Charlestown Bunker Hill.
   - **FAA Class B & Obstacle Restricted Zones:** Logan Runway 22L/22R Active Approach Cone and Downtown Financial District High-Rise Wake Core.
   - **4 Blue/Green & Highway Acoustic Masking Flyways:** Boston Inner Harbor, Charles River Basin, I-90 Mass Pike / Rail Trench, and Mystic River Industrial Channel.
   - **Live Animated eVTOL Aircraft & Telemetry HUD:** Real-time altitude (ft MSL), airspeed (kt), nadir ground noise (dBA), and active sector tracking.

2. **Transparent 5-Round Negotiation Protocol (`backend/engine/negotiationSimulator.js`)**
   - **Round 1 — Direct Geodesic Proposal & Audit:** Operator proposes the energy-minimal straight line (`720 ft MSL`). City Agent and Community Agent run spatial audits and trigger formal **Safety & Equity Vetoes**.
   - **Round 2 — Regulatory Safety Enforcement:** City Agent mandates municipal corridor gates (e.g., *FAA South Harbor Gate*) to clear commercial jet approach cones and high-rise wind shear.
   - **Round 3 — Community Environmental Justice Flyway:** Community Agent shifts waypoints onto over-water channels and depressed highway trenches (*I-90 Mass Pike / Charles River Basin*) where ambient noise masks rotor acoustics and raises cruise altitude to `1,500+ ft MSL`.
   - **Round 4 — Pareto-Optimal Nash Bargaining Synthesis:** Operator negotiates cruise-climb speed and continuous low-blade-vortex-interaction (BVI) descent to recover battery margin while preserving **0 EJ violations** and **0 FAA conflicts**.
   - **Round 5 — Cryptographic Attestation:** Mints a SHA-256 signed **Auditable Consensus Record** with tri-agent signatures and a neighborhood-by-neighborhood compliance ledger.

3. **Interactive "Drop Citizen Quiet Zone" Mode & Governance Weight Sliders**
   - Click **`📍 + Drop Quiet Zone`** and click anywhere on the Boston map to place a dynamic community noise shield — the three agents immediately re-negotiate lateral bypass gates around your zone in real time.
   - Drag the **Policy Bargaining Weight Sliders ($w_C, w_O, w_M$)** to dynamically shift governance priority between Community Equity, Operator Efficiency, and City Safety.

---

## Mathematical & Technical Architecture

```
skyline-consensus/
├── server.js                              # Express REST API & Web Application Server
├── backend/
│   ├── data/
│   │   └── bostonAirspace.js              # Boston vertiports, MassGIS EJ zones, FAA cones & flyways
│   ├── engine/
│   │   ├── acousticsAndPhysics.js         # 3D trajectory discretization, dBA model, kWh & Jain index
│   │   ├── agents.js                      # Community, Operator & City utility functions + route solver
│   │   └── negotiationSimulator.js        # 5-round protocol orchestrator & SHA-256 proof generator
│   ├── cli.js                             # Terminal simulation runner
│   └── test.js                            # Automated verification test suite
├── public/
│   ├── index.html                         # Mission Control web interface
│   ├── styles.css                         # Aviation dark-mode UI styling
│   └── app.js                             # Map rendering, live playback, SVG profile chart & HUD
└── DEMO_VIDEO_SCRIPT.md                   # 2:30 choreography & voiceover script for judging
```

### Acoustic Propagation, Energy & Fairness Formulation

- **Spherical Spreading + Atmospheric & Masking Acoustics ($L_{Aeq}$):**
  \[
  L_{Aeq}(R) = L_{\text{ref}}(100\text{m}) - 20 \log_{10}\!\left(\frac{R}{100}\right) - \alpha (R - 100) + \Delta L_{\text{regime}} + \Delta L_{\text{speed}} - \Delta L_{\text{masking}}
  \]
  where $R = \sqrt{d_{\text{horiz}}^2 + h_{\text{alt}}^2}$ is the 3D slant range from the discretized trajectory sample (~100m intervals) to the neighborhood receptor, and $\Delta L_{\text{masking}}$ credits trajectories aligned with blue water channels or the 70+ dBA I-90 / I-93 highway corridors.
- **Jain's Inter-Neighborhood Fairness Index:**
  \[
  \mathcal{J}(u_1, u_2, \dots, u_N) = \frac{\left(\sum_{i=1}^N u_i\right)^2}{N \sum_{i=1}^N u_i^2} \in [0, 1]
  \]
  measuring acoustic equity across all Boston census tracts weighted by MassGIS Environmental Justice criteria ($w_{\text{EJ}} \in [1.15, 1.60]$).
- **Weighted Nash Bargaining Equilibrium:**
  \[
  \max_{\tau \in \mathcal{T}_{\text{safe}}} (U_{\text{Comm}}(\tau) - d_C)^{w_C} (U_{\text{Oper}}(\tau) - d_O)^{w_O} (U_{\text{City}}(\tau) - d_M)^{w_M}
  \]

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check and protocol version (`SKYLINE-CONSENSUS-v1.4-BOS`) |
| `GET` | `/api/airspace` | Full Boston geodata: vertiports, EJ polygons, restricted zones, flyways, and scenarios |
| `GET` | `/api/negotiate?scenarioId=bos-lma-medical` | Run multi-agent negotiation for a preset scenario |
| `POST` | `/api/negotiate` | Run negotiation with custom `originId`, `destinationId`, `timeOfDay`, `weather`, `weights`, and `customZones` |
| `POST` | `/api/evaluate-route` | Evaluate any custom 3D waypoint array through the acoustic, energy & equity engine |

---

## Challenge Alignment

Judged on: problem relevance, innovation, technical execution, demo-readiness, deployment pathway.

- **Problem Relevance:** Community noise opposition and airspace deconfliction near coastal Class B airports like Boston Logan are the #1 bottleneck to urban eVTOL deployment.
- **Innovation:** Replaces opaque, static FAA noise contours with a dynamic, flight-by-flight multi-agent negotiation protocol that treats Environmental Justice neighborhoods as first-class bargaining participants with veto power.
- **Technical Execution:** Combines 3D geodesic discretization, spherical-spreading acoustics, highway/water masking physics, Jain's fairness index, and Nash bargaining with SHA-256 cryptographic attestation.
- **Demo-Readiness:** One-command startup (`npm start`), 5 real Boston scenarios, live round-by-round negotiation playback, interactive click-to-drop citizen quiet zones, and a complete [Demo Video Script](./DEMO_VIDEO_SCRIPT.md).
- **Deployment Pathway:** Designed as an Unmanned Aircraft System Traffic Management (UTM) / Provider of Services for UAM (PSU) pre-departure clearance microservice that integrates into FAA NextGen, MassDOT Aeronautics, and municipal digital twins.

## Status

✅ **Complete & Demo-Ready** — HTCJ × PROOF Aviation Futures Challenge submission.
