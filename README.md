# Beyond the Horizon

**Try it Out:** https://beyond-the-horizon-273133486180.us-central1.run.app

**License:** Apache License 2.0 (https://opensource.org/license/apache-2-0)

## Quick Start

### Spin up instructions

**Prerequisites:** Node.js 18+, npm

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env.local`:
   ```bash
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## A New Fan Experience to Explore Team USA Data

**Beyond the Horizon** is a **multi-agent AI experience powered by Gemini** that transforms **127 years (1900–2026)** of Team USA Olympic & Paralympic athlete data into an immersive, explorable 3D world. Powered by a **Conversational Data Analyst Agent**, **Hometown Intelligence Agent**, and **Storytelling Agent**, fans can fly across the United States to uncover hometown patterns, collective milestones, regional hubs, and inspiring stories across diverse athlete communities.

The app is inherently **multimodal**, combining voice interaction + 3D immersion so that the data is not just read — it is experienced through conversation, visuals, and exploration. A core part of the experience is the **Gemini Live Conversational Data Analyst Agent**, where fans can naturally ask questions about 54 sports, Team USA representation, and their own athletic interests. Gemini reasons over the data in real time and **dynamically updates the 3D world** — highlighting states, surfacing geographic insights, and generating visualizations directly on the map as the conversation unfolds.

## Dataset Construction & Map Intelligence

The dataset was built entirely from **publicly available Team USA data** from the Official Team USA Website (www.teamusa.com), following the hackathon's strict public-only data policy. We structured data for **2,238 Team USA athletes** across **54 sports**, including **40 Olympic** and **14 Paralympic sports**, with a deliberate emphasis on strong **Paralympic representation** through sports such as Para Swimming, Para Track & Field, Wheelchair Basketball, Wheelchair Rugby, Sled Hockey, and Wheelchair Tennis. The dataset spans **1,188 hometown cities**, **68 states and territories**, and **127 years** of Team USA representation from **1900–2026**.

**Gemini** structures public Team USA data into clean CSV pipelines for multi-agent analysis. **Google Maps API** and **USMap3D** power state-level geographic exploration. The app shows **no individual athlete NIL** and uses only permitted public data: medals, participation, and hometown representation.

## Technical Overview

| Layer | Technologies / Models | Purpose |
|---|---|---|
| Frontend + UI | React, Vite, TypeScript, TailwindCSS, shadcn/ui, Lucide React, Motion | Core interface, responsive design, animated panels, and polished user interactions |
| 3D Map + Geographic Visualization | Three.js, React Three Fiber, Custom USMap3D, Google Maps API, D3-geo, TopoJSON | Interactive U.S. map with state-level granularity, camera controls, projections, and dynamic state highlighting |
| Data Processing | PapaParse, structured CSV datasets | Parses athlete, sport, medal, hometown, year, and regional data for live filtering and analysis |
| AI Agents + Multimodal Gemini Models | Gemini 3.1 Flash Live Preview API, Google Gen AI SDK, gemini-flash-latest, gemini-2.5-flash-image, custom tool calling | Powers voice-based analysis, multilingual queries, storytelling, structured data retrieval, and AI-generated visual narratives |
| Cloud Deployment + App Development | Docker, Node 22 Alpine, Nginx Alpine, Google Cloud Run, Cloud Build, Google AI Studio | Supports scalable deployment, static serving, continuous builds, debugging, and rapid iteration |

## Core Features + How They Work

### 1. Gemini Live Conversational Data Analyst Agent

We designed this agent to make Team USA data feel conversational instead of static.

Built using the **Google Gemini 3.1 Flash Live Preview API**, **Google Gen AI SDK**, and a custom tool-calling architecture, the agent supports real-time streaming voice interaction, multilingual querying, and live data retrieval across our Team USA Olympic & Paralympic sports datasets.

**How it works:**
- `get_sport_data`: retrieves structured CSV data for a selected sport, including athlete counts, hometown/state distribution, and medal totals
- `highlight_states`: sends geographic results to the custom **USMap3D** component, where each highlighted state displays athlete count and medal breakdowns across gold, silver, and bronze
- Outputs are streamed back to the frontend and synchronized with the **Three.js** environment, dynamically triggering state highlighting and dynamic **3D visualizations**. Users can generate three live chart panels: **representation over time**, **hometown/state representation**, and **medal composition percentage**.

### 2. Generative Storytelling Agent

We created this agent to make the experience feel human, emotional, and inspiring — not just analytical.

Built using **Gemini Flash** for text generation and **Gemini 2.5 Flash Image (Nano Banana)** for AI-generated illustrations, the agent turns **publicly available, real Team USA story data** into structured visual narratives.

**How it works:**
- Uses real public Team USA stories highlighting themes such as **AAPI**, **Hispanic**, **LGBTQ**, **Military**, and **Women athletes**
- Uses the Google Gen AI SDK's `generateContent()` method to transform article content into a **4-slide narrative** with milestones, state highlights, and story beats
- Uses Gemini Flash to generate detailed illustration prompts, then passes them to Gemini 2.5 Flash Image to create colorful animated visuals
- Avoids Olympic branding and individual athlete NIL by using synthetic, collective-level scenes instead of real athlete images

### 3. Hometown Intelligence Agent + Hometown Hub Athlete Identity Overview

This agent powers the state-level intelligence and exploration layer of the platform.

- Uses  'Google Search tool' to retrieve context on potential hometown training sites, pathways, regional sport infrastructure, and programs that may help foster Team USA excellence, including Paralympic training hubs.
- Processes **54 structured CSV datasets** using **PapaParse**, aggregating athlete hometown data across sports, medal counts, years represented, education, and regional metadata.
- Uses `getStateSportStatistics()` to compute state-specific Olympic and Paralympic representation, per-sport athlete counts, gold/silver/bronze medal totals, medalist vs. qualified athlete breakdowns, and timeline coverage from **1900–2026**.
- Generates a dynamic **Athlete Identity Overview panel** for each state, showing collective representation patterns, regional sport hubs, participation trends, and historical evolution with timeline slider.

### 4. GeoQuest — GeoGuessr-Inspired Exploration

Inspired by the gamified engagement of GeoGuessr, **GeoQuest** turns hometown data discovery into a playable exploration experience.

- Built using the **Google Maps Street View API**, allowing users to navigate real-world hometown environments tied to Team USA athlete regions, while Gemini dynamically generates clues from athlete representation data
- Combines geographic exploration + AI-generated reasoning into a repeatable gameplay loop designed to increase fan engagement & discovery.

---

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>
