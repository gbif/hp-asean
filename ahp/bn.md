---
layout: heroImage
title: Brunei Darussalam AHPs
background: ahp/AHP Photos/BRUNEI DARUSSALAM/Tasek Merimbun Heritage Park/RGalsim_AERIAL VIEW OF TASEK MERIMBUN TUTONG _HMYusof IMG_4641.jpg
imageLicense: |
  *Photo by Aung Kyaw Moe Chin, Zooming In on Biodiversity
description: Both a natural and cultural heritage of Brunei, this is the country’s biggest wildlife sanctuary, a recreational centre and venue for research and education. It is one of the seven Important Bird Areas (IBAs) in the country, where you can find the Black Lake Tasek Merimbun Heritage Park is known as the home of ethnic Dusuns.
height: 70vh
---

<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
  /* --- PAGE LAYOUT & RESET --- */
  * { box-sizing: border-box; }
  
  /*
  body {
    margin: 0;
    padding: 40px;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f0f2f5;
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }
  */

  /* --- GRID CONTAINER --- */
  /* This keeps the cards organized in a row/column */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 30px;
    width: 100%;
    max-width: 1200px;
  }

  /* --- CARD STRUCTURE --- */
  .flip-card {
    background-color: transparent;
    height: 350px; /* Fixed height for uniformity */
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
    font-size: 1.0rem;
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
    <div class="flip-card card-2">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <!---div class="icon">🐅</div--->
          <h2 class="title">Tasek Merimbun Heritage Park</h2>
          <p class="subtitle">Contact Information <br>
            Jabatan Muzium-Muzium <br>
            Kementerian Kebudayaan, Belia dan Sukan <br>
            Negara Brunei Darussalam <br>
            Email: info@muzium.gov.bn <br>
            Website: www.museums.gov.bn <br>
            Instagram: @jabatanmuziummuziumbrunei</p>
          <div class="hint">Hover for Data</div>
        </div>
        <div class="flip-card-back">
          <div class="stat-highlight">6,736 results with coordinates</div>
          <p class="description"><b>Location</b>b <br>
          32 kilometres south of Tutong-Kuala Belait coastal highway on the west bank of Sungai Tutong in Mukim Rambal, Tutong District, Brunei Darussalam.
          <b>Area</b> <br>
          7,800 hectares
          <b>Date declared as an AHP</b>b> <br>
          29 November 1984, at the Second ASEAN Ministerial Meeting, Bangkok, Thailand
          <b>Other international designations</b>b> <br>
          –
          <b>Habitat types</b>b> <br>
          Mangroves; freshwater swamp forest; peat swamps; lowland mixed dipterocarp forest; kerangas; old secondary forest; and grass marshes.</p>
          <a href="https://asean.hp.gbif-staging.org/occurrence/search?geometry=POLYGON%28%28114.72448+4.48036%2C114.73679+4.48054%2C114.73805+4.5535%2C114.72605+4.56932%2C114.71621+4.57625%2C114.71049+4.61077%2C114.69891+4.61108%2C114.65977+4.61828%2C114.64882+4.60325%2C114.6546+4.58573%2C114.63348+4.55505%2C114.62753+4.53971%2C114.62472+4.5203%2C114.62566+4.48148%2C114.72364+4.48032%2C114.72366+4.48034%2C114.72448+4.48036%29%29&view=map" target="_blank" class="btn">View AHP Map</a>
        </div>
      </div>
    </div>
  </div>
