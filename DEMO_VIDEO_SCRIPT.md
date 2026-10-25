# Skyline Consensus — Demo Video Script (HTCJ × PROOF Aviation Futures Challenge)

**Target Duration:** 2 minutes 30 seconds (150 seconds)  
**Format:** 1080p / 4K Screen Recording of the Skyline Consensus Mission Control Web Demo (`http://localhost:3000`) + Voiceover  
**Core Theme:** *"Don't pitch the future. **Prove it's fair.**"*

---

## Pre-Recording Setup Checklist

1. Start the application server:
   ```bash
   npm install && npm start
   ```
2. Open `http://localhost:3000` in a full-screen browser window.
3. Ensure the default scenario **`Logan (BOS) → Longwood Medical (LMA)`** is selected.
4. Set zoom so Logan Airport (`BOS`), East Boston, the Seaport, South End, and Longwood Medical (`LMA`) are all clearly framed.

---

## Scene-by-Scene Script & Choreography

### Scene 1 — The Hook: Why Urban Air Mobility Stalls at the Community Level (0:00 – 0:25)

* **Visual Action:**
  * Start on the full **Skyline Consensus** Mission Control interface showing Greater Boston.
  * Hover over the red **East Boston (`east-boston-ej`)**, **Chinatown (`chinatown-leather-ej`)**, and **South End Medical (`south-end-medical-ej`)** polygons to reveal their population density, Environmental Justice (EJ) criteria, and `53.5–55.0 dBA` noise ceilings.
* **Voiceover (Narrator):**
  > *"Electric vertical takeoff and landing aircraft—eVTOLs—promise a 3-minute medical and commuter link from Boston Logan Airport to the Longwood Medical Area. So why hasn't urban air mobility scaled in cities like Boston? Because a straight line on an airline's map cuts directly across Environmental Justice neighborhoods like East Boston, Chinatown, and the South End—and through FAA Logan Class B approach cones."*
  >
  > *"Public trust in aviation won't come from promises. **Don't pitch the future. Prove it's fair.** This is **Skyline Consensus**."*

---

### Scene 2 — Live Multi-Agent Negotiation Protocol in Action (0:25 – 1:15)

* **Visual Action:**
  * Click **`▶ Run Live Negotiation`** in the top bar.
  * **Round 1 (`0:28`):** Point to the red dashed geodesic route (`R1: Direct Baseline`) appearing on the map and the Consensus Score dropping to **`14 / 100 (ROUND 1: VETOED)`**. Highlight the right-hand Protocol Feed showing `VETO_SAFETY_AIRSPACE` from the **City Agent** and `VETO_ACOUSTIC_EQUITY` (`64.4 dBA`, `53,182 EJ residents exposed`) from the **Community Agent**.
  * **Round 2 (`0:42`):** Watch the amber route (`R2: City Regulatory Route`) appear as the **City Agent** injects the **FAA South Harbor Gate**, clearing Runway 22L. Consensus rises to **`50 / 100`**, but the **Community Agent** holds due to `55.8 dBA` residential edge exposure.
  * **Round 3 (`0:55`):** Watch the purple route (`R3: Community EJ Proposal`) shift onto the **I-90 Mass Pike / Rail Trench Acoustic Masking Corridor** at `1,580 ft MSL`.
  * **Round 4 & 5 (`1:05`):** Watch the glowing emerald trajectory (`R4: Skyline Consensus Path`) lock in as all three agents converge on a **Pareto-Optimal Nash Bargaining Equilibrium**. The Consensus Score dial hits **`93 / 100`**, and the animated eVTOL icon cruises along the corridor with live telemetry (`1,490 ft MSL | 47.8 dBA`).
* **Voiceover (Narrator):**
  > *"For every flight request, Skyline Consensus runs a transparent, five-round negotiation protocol between three AI agents with competing mandates:"*
  > *"In **Round 1**, the **Operator Agent** proposes the minimum-energy direct geodesic path at 720 feet. Immediately, the **City & FAA Agent** issues a hard regulatory veto for invading Logan Runway 22L's approach cone, and the **Community Agent** issues an equity veto—citing 64.4 dBA peak noise and over 53,000 Environmental Justice residents exposed."*
  > *"In **Round 2**, the City Agent injects mandatory harbor airspace gates. In **Round 3**, the Community Agent shifts the path onto Boston's depressed I-90 Mass Pike rail trench—where 70 dBA highway traffic acoustically masks the aircraft overhead."*
  > *"In **Round 4**, the Operator negotiates a continuous low-blade-vortex-interaction descent to recover battery margin. All three agents converge on a Nash Bargaining equilibrium: **93 out of 100 Consensus Score**, cutting community ground noise by **15.9 dBA—a 97% reduction in acoustic energy**—and reducing EJ population exposure from **53,182 to zero**, while adding just **21 seconds** of flight time."*

---

### Scene 3 — Interactive Citizen Quiet Zone & Policy Bargaining Sliders (1:15 – 1:50)

* **Visual Action:**
  * Click **`📍 + Drop Quiet Zone`** in the top bar.
  * Click on the map along the active corridor (e.g., near Copley / Back Bay / Kenmore) to drop **`Citizen Quiet Shield #1`** (glowing pink circle).
  * Show the emerald Consensus route instantaneously deflecting laterally around the citizen zone and stepping up altitude!
  * Next, look at the **Bottom Analytics Drawer**:
    * Show **Tab 1 (`📈 Acoustic & Altitude Cross-Section`)** comparing the red dashed R1 noise spike against the emerald R4 curve staying cleanly below the red EJ Cap line.
    * Switch to **Tab 2 (`🏘️ Boston Neighborhood EJ Audit Ledger`)** showing every Boston neighborhood marked **`✓ COMPLIANT`** with Jain's Fairness Index at **`1.0000`**.
* **Voiceover (Narrator):**
  > *"What if a school event, outdoor clinic, or neighborhood council requests dynamic protection? With **Citizen Quiet Zone Mode**, clicking anywhere on the Boston map drops a real-time acoustic shield. Watch the agents immediately re-negotiate a lateral bypass gate and altitude step-up around the zone in milliseconds."*
  > *"Below the map, regulators and residents can inspect the 3D Altitude and Ground Noise Cross-Section and the neighborhood-by-neighborhood Environmental Justice Audit Ledger—proving a Jain's Fairness Index of 1.0000 across all eight Boston tracts."*

---

### Scene 4 — Multi-Scenario Stress Test & Cryptographic Proof of Fairness (1:50 – 2:30)

* **Visual Action:**
  * Switch the **Boston Corridor Preset** dropdown to **`Seaport (SBP) → Kendall Square / MIT (KSQ)`** (showing the Charles River Basin water flyway) and then **`Logan (BOS) → South Station (BBY) [Night Curfew]`** (showing the 48 dBA night curfew harbor dogleg).
  * Click **`📜 Audit Proof`** in the top right to open the **Auditable Consensus Record** modal.
  * Highlight the **Certificate ID (`BOS-AAM-...`)**, the **Tri-Agent Signatures**, and the **SHA-256 Verifiable JSON Payload**, then click **`⬇ Download Signed JSON`**.
* **Voiceover (Narrator):**
  > *"Whether routing cross-harbor shuttles from Seaport to Kendall Square up the Charles River Basin, or enforcing a 48 dBA nighttime curfew out of Logan, every clearance mints a SHA-256 signed **Auditable Consensus Record**."*
  > *"Every proposal, veto, decibel reading, and agent signature is permanently verifiable. With Skyline Consensus, cities don't have to take an operator's word that a flight path is safe and equitable—they have the cryptographic proof. **Don't pitch the future. Prove it's fair.**"*
