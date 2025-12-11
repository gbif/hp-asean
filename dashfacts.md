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

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Interactive Card Grid</title>
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

</style>
</head>
<body>

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

  </div>

</body>
</html>
