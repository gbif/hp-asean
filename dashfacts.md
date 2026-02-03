---
layout: heroImage
lang-ref: dashfacts
title: Dash Facts
background: assets/images/Aung Kyaw Moe_Chin Women.jpg
imageLicense: |
  *Photo by Aung Kyaw Moe Chin, Zooming In on Biodiversity
description: Total Species Count of Selected Taxonomic Groups in the ASEAN Region
height: 70vh
---

<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
  /* --- PAGE LAYOUT & RESET --- */
  * { box-sizing: border-box; }
  
  body {
    margin: 0;
    padding: 40px;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f0f2f5;
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }

  /* --- GRID CONTAINER --- */
  /* This keeps the cards organized in a row/column */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    width: 100%;
    max-width: 1200px;
  }

  /* --- CARD STRUCTURE --- */
  .flip-card {
    background-color: transparent;
    height: 400px; /* Fixed height for uniformity */
    perspective: 1000px; /* Essential for 3D effect */
    cursor: pointer;
  }

  /* The inner container that actually flips */
  .flip-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy effect */
    transform-style: preserve-3d;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }

  /* Hover trigger */
  .flip-card:hover .flip-card-inner {
    transform: rotateY(180deg);
  }

  /* --- FRONT & BACK FACES --- */
  .flip-card-front, .flip-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    -webkit-backface-visibility: hidden; /* Safari */
    backface-visibility: hidden; /* Hides the back when facing away */
    border-radius: 15px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  /* FRONT Styling */
  .flip-card-front {
    background: white;
    color: #333;
    border-bottom: 5px solid transparent;
  }

  /* Specific border colors for visual variety */
  .card-1 .flip-card-front { border-bottom-color: #004D40; } /* Jungle Green */
  .card-2 .flip-card-front { border-bottom-color: #FF5722; } /* Deep Orange */
  .card-3 .flip-card-front { border-bottom-color: #2979FF; } /* Blue */
  .card-4 .flip-card-front { border-bottom-color: #1cda4f; } /* Green */
  .card-5 .flip-card-front { border-bottom-color: #cee949; } /* Green */
  .card-6 .flip-card-front { border-bottom-color: #da1c9e; } /* Green */

  .icon {
    font-size: 3.5rem;
    margin-bottom: 20px;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #2c3e50;
  }

  .subtitle {
    font-size: 1rem;
    color: #7f8c8d;
    margin-top: 10px;
  }

  .hint {
    margin-top: auto;
    font-size: 0.8rem;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* BACK Styling */
  .flip-card-back {
    color: white;
    transform: rotateY(180deg);
  }

  /* Individual Card Back Colors */
  .card-1 .flip-card-back { background: linear-gradient(135deg, #004D40, #00695c); }
  .card-2 .flip-card-back { background: linear-gradient(135deg, #FF5722, #E64A19); }
  .card-3 .flip-card-back { background: linear-gradient(135deg, #2979FF, #1565C0); }
  .card-4 .flip-card-back { background: linear-gradient(135deg, #12de75, #20d06f); }
  .card-5 .flip-card-back { background: linear-gradient(135deg, #cee949, #cee949); }
  .card-6 .flip-card-back { background: linear-gradient(135deg, #da1c9e, #da1c9e); }

  .description {
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .stat-highlight {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.5);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    text-decoration: none;
    font-weight: bold;
    margin-top: auto;
    transition: background 0.3s;
  }

  .btn:hover {
    background: white;
    color: #333;
  }

/* --- BACK STYLES --- */
.dashfact-back {
  background-color: white;
  color: #333;
  transform: rotateY(180deg);
  border: 2px solid var(--jungle-green);
  text-align: left;
  align-items: flex-start; /* Align text to left */
}

.dashfact-back h3 {
  color: var(--jungle-green);
  margin-top: 0;
}

.fact-text {
  font-size: 0.9rem;
  line-height: 1.4;
  color: #555;
}

/* Mini Data Visualization */
.data-vis-container {
  width: 100%;
  margin: 15px 0;
  padding: 10px;
  background: var(--mist-white);
  border-radius: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: bold;
  color: #777;
  margin-bottom: 5px;
}

.bar-chart {
  position: relative;
  height: 10px;
  background: #ddd;
  border-radius: 5px;
  margin-bottom: 5px;
}

.bar {
  height: 100%;
  border-radius: 5px;
  position: absolute;
  top: 0;
  left: 0;
}

.bar.honey-bee {
  background-color: #999;
  z-index: 2;
}

.bar.wallace-bee {
  background-color: var(--sun-gold);
  z-index: 1;
}

.stats-label {
  font-size: 0.75rem;
  color: var(--jungle-green);
  font-weight: bold;
  text-align: right;
}

</style>

<!---h1>ASEAN Biodiversity DashFacts</h1><br><br--->
  <div class="card-grid">

    <div class="flip-card card-1">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🌿</div>
          <h2 class="title">Forest Cover</h2>
          <p class="subtitle">ASEAN Region</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">45%</div>
          <p class="description">ASEAN contains three of the world's major forest blocks, but cover is declining rapidly.</p>
          
          <div class="data-vis-container">
        <div class="label-row">
          <span>Honey Bee</span>
          <span>Wallace's Bee</span>
        </div>
        <div class="bar-chart">
          <div class="bar honey-bee" style="width: 25%;"></div>
          <div class="bar wallace-bee" style="width: 100%;"></div>
        </div>
        <div class="stats-label">Wingspan: 2.5 inches</div>
      </div>
          
          <a href="#" class="btn">View Map</a>
        </div>
      </div>
    </div>

    <div class="flip-card card-2">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🐅</div>
          <h2 class="title">Endangered</h2>
          <p class="subtitle">Critical Species</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">220+</div>
          <p class="description">Species are currently listed as Critically Endangered, including the Sumatran Tiger.</p>
          <a href="#" class="btn">Donate</a>
        </div>
      </div>
    </div>

    <div class="flip-card card-3">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🪸</div>
          <h2 class="title">Coral Triangle</h2>
          <p class="subtitle">Marine Health</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">76%</div>
          <p class="description">Of the world's coral species are found here, supporting millions of livelihoods.</p>
          <a href="#" class="btn">Deep Dive</a>
        </div>
      </div>
    </div>

    <div class="flip-card card-4">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🪸</div>
          <h2 class="title">ASEAN Heritage Parks</h2>
          <p class="subtitle">List of AHPs</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">45%</div>
          <p class="description">List of ASEAN Heritage Parks</p>
          <a href="#" class="btn">Deep Dive</a>
        </div>
      </div>
    </div>

    <div class="flip-card card-5">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🪸</div>
          <h2 class="title">ASEAN Protected Areas</h2>
          <p class="subtitle">List of AHPs</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">30%</div>
          <p class="description">List of ASEAN Heritage Parks</p>
          <a href="#" class="btn">Deep Dive</a>
        </div>
      </div>
    </div>

    <div class="flip-card card-6">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="icon">🐝</div>
          <h2 class="title">ASEAN Countries</h2>
          <p class="subtitle">List of AHPs</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">68%</div>
          <p class="description">List of ASEAN Heritage Parks</p>
          <a href="#" class="btn">Deep Dive</a>
        </div>
      </div>
    </div>