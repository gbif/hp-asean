latest:
  title: Biodiversity Data Mobilisation
composition:
  #- type: blank
   # data: home.main
    # href: https://dashboard.aseanbiodiversity.org/
  - type: latestPosts
    data: home
    height: 50vh
# blueprint_with_video:
  # klass: home_video
  # this is based on the product block
  # markdownContent: |
    # <div class="feature-img">
      # <iframe src="https://youtu.be/kD7wdGlC4ck?si=8inlyDtD9ueOPrnq" title="ASEAN Biodiversity Dashboard" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen>
      # </iframe>
    # </div>
    
    # <div class="feature-content">
        # <div class="feature-text">
          #   <h3 class="feature-title">
            #     <p>A Data Sharing Platform to Monitor Biodiversity Trends and Species Occurrence in the ASEAN Region</p>
            # </h3>
        # </div>
    # </div>

main:
  klass: home_main
  # this is based on the hero image block
  # Previous version of search : # document.getElementById("home-search-form").action = "/specimen/search";
  markdownContent: |
    <script>
    function switchToSpecimens() {
      document.getElementById("home-search-form").action = "/occurrence/search";
      document.getElementById("home-search-input").placeholder = "e.g. Scientific names, common names, countries";
      document.getElementById("home-tab-specimens").classList.add("is-primary");
      document.getElementById("home-tab-institutions").classList.remove("is-primary");
    }

    function switchToInstitutions() {
      document.getElementById("home-search-form").action = "/institution/search";
      document.getElementById("home-search-input").placeholder = "e.g. organisations, museums, academe";
      document.getElementById("home-tab-institutions").classList.add("is-primary");
      document.getElementById("home-tab-specimens").classList.remove("is-primary");
    }

    async function getGBIFCount(params) {
      const response = await fetch(
          `https://graphql.gbif.org/graphql?${params}`,
          // use a 5 second timeout
          {signal: AbortSignal.timeout(5000)}
        );
      const result = await response.json();
      return result.data;
    }

    (async function getRecordCount() {
      // the parameters for both institution count and specimen count requests have been
      // nabbed from the search pages. GBIF's graphql is not stable and public so we're
      // at the merci of GBIF and will need to keep these up to date.
      const institutionParams = new URLSearchParams({
        "queryId": "1c84363fc177dc850aab74997d133172a3e09af2",
        "strict": true,
        "variables": JSON.stringify({
          "displayOnNHCPortal": true,
          "country":"GB",
          "active":true,
          "limit":0,
        }),
      });
      const specimenParams = new URLSearchParams({
        "queryId": "605377d28a427710e6009c242a3ddda217188884",
        "strict": true,
        "variables": JSON.stringify({
          "predicate": siteConfig.occurrence.rootPredicate,
          "size": 0,
        }),
      });
      try {
        const specimenCount = (await getGBIFCount(specimenParams)).occurrenceSearch.documents.total;
        const institutionCount = (await getGBIFCount(institutionParams)).institutionSearch.count;
        document.getElementById("home-feature-subtitle-rcount").textContent = specimenCount.toLocaleString("en");
        document.getElementById("home-feature-subtitle-icount").textContent = institutionCount;
        document.getElementById("home-feature-subtitle-nocount").style.display = "none";
        document.getElementById("home-feature-subtitle-count").style.display = "inline";
      } catch (error) {
        // swallow all errors, nom nom nom, but do log
        console.log(`An error occurred while loading the counts: ${error}`);
      }
    })();
    </script>

    <div class="feature-img">
        <img src="assets/images/Soe Mg Mg Zaw_Father Love 2.jpg">
        <div class="feature-img-license">
            <div class="feature-img-license-c">
                <span class="icon"><i class="fa fa-info-circle"></i></span>
            </div>
            <div class="feature-img-license-text">
                <p>Copyright Zooming In on Biodiversity : Soe Mg Mg Zaw</p>
            </div>
        </div>
    </div>
    <div class="feature-content">
        <h2 class="home-feature-title">ASEAN Biodiversity Dashboard</h2>
        <font size="5">ASEAN Species Collections</font><br>
        <br>
        <div class="home-search-wrapper">
            <div class="home-search">
                <div class="home-tabs">
                    <div class="button is-primary" id="home-tab-specimens"
                         onclick="switchToSpecimens()">
                        <span>Search species</span>
                    </div>
                    <div class="button" id="home-tab-institutions"
                         onclick="switchToInstitutions()">
                        <span>Search institutions</span>
                    </div>
                </div>
                <form id="home-search-form" action="/occurrence/search" method="GET">
                    <input type="search"
                           name="q"
                           id="home-search-input"
                           value=""
                           autocomplete="On"
                           placeholder="e.g. Scientific names, common names, countries">
                    <button type="submit">Search</button>
                </form>
            </div>
        </div>
    </div>

stats:
  features:
      # See script.js > includes :folder
    - title: <span id="mapCount" class="ajax-is-loading">Loading</span>
      description: Species occurrence
      background: assets/icons/occ-bio.png
      href: /occurrence/search
    - title: <span id="datasetCount" class="ajax-is-loading">Loading</span>
      description: Dataset records
      background: assets/icons/eco-data.png
      href: /occurrence/search/?view=DATASETS
    - title: <span>10</span>
      description: ASEAN Countries
      background: assets/icons/asean-bio.png
      href: /occurrence/search?country=BN&country=TH&country=ID&country=MY&country=PH&country=SG&country=VN&country=KH&country=MM&country=LA&view=map
    - title: <span>261</span>
    # - title: <span id="institutionCount" class="ajax-is-loading">Loading</span>
      description: ASEAN Institutions
      background: assets/icons/museum.png
      href: /institution/search?country=BN&country=KH&country=ID&country=LA&country=MY&country=MM&country=PH&country=SG&country=TH&country=VN
    # - title: <span>2,648</span>
      # description: Protected Areas
      # background: assets/icons/Icon_protected-areas.png
      # href: 
    - title: <span id="imageCount" class="ajax-is-loading">Loading</span>
      description: Species with photos
      background: assets/icons/plant-bio.png
      href: /occurrence/search/?view=GALLERY
    - type: dashboard
      data: acbstats.dashboard 
