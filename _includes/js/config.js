var siteTheme = gbifReactComponents.themeBuilder.extend({
  baseTheme: 'light', extendWith: {
    primary: themeStyle.colors.primary
  }
});

var siteConfig = {
  "version": 3,
  "pages": [
    {
      "id": "occurrenceSearch"
    },
    {
      "id": "collectionSearch"
    },
    {
      "id": "collectionKey"
    },
    {
      "id": "institutionSearch"
    },
    {
      "id": "institutionKey"
    },
    {
      "id": "literatureSearch"
    }
  ],
  "disableInlineTableFilterButtons": false,
  "availableCatalogues": [
    "OCCURRENCE"
  ],
  "dataHeader": {
    "enableApiPopup": false,
    "enableInfoPopup": false
  },
  "theme": {
    "primary": "#ff581d",
    "borderRadius": 3,
    "stickyOffset": "0px",
    iucnColors: { // these are the official IUCN colors for the Red List categories according to their website. 
      "NA": "#C1B5A5",
      "NE": "#FFFFFF",
      "DD": "#D1D1C6",
      "CD": '#D1628E',
      "LR": '#D1628E',
      "LC": "#60C659",
      "NT": "#CCE226",
      "VU": "#F9E814",
      "EN": "#FC7F3F",
      "CR": "#D81E05",
      "RE": "#9B4F96",
      "EW": "#542344",
      "EX": "#000000"
    }
  },
  "maps": {
    "mapStyles": {
      "defaultProjection": "MERCATOR",
      "defaultMapStyle": "BRIGHT",
      "options": {
        "MERCATOR": [
          "BRIGHT",
          "NATURAL"
        ]
      }
    }
  },
  "languages": [
    {
      "code": "en",
      "localeCode": "en",
      "label": "English",
      "default": true,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "mm",
      "localeCode": "es",
      "label": "Burmese",
      "default": false,
      "textDirection": "ltr",
      "cmsLocale": "es",
      "vocabularyLocale": "es-ES",
      "iso3LetterCode": "spa",
      "gbifOrgLocalePrefix": "/es",
      "grSciCollLocalePrefix": "/es",
      "mapTileLocale": "es"
    },
    {
      "code": "kh",
      "localeCode": "en",
      "label": "English",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "id",
      "localeCode": "en",
      "label": "Indonesian",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "la",
      "localeCode": "en",
      "label": "Lao",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "my",
      "localeCode": "en",
      "label": "Malay",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "th",
      "localeCode": "en",
      "label": "Thai",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    },
    {
      "code": "vn",
      "localeCode": "en",
      "label": "Vietnamese",
      "default": false,
      "textDirection": "ltr",
      "iso3LetterCode": "eng",
      "cmsLocale": "en-GB",
      "gbifOrgLocalePrefix": "",
      "mapTileLocale": "en"
    }
  ],
  "messages": {},
  "occurrenceSearch": {
    "scope": {
      "type": "and",
      "predicates": [
        {
          "type": "in",
          "key": "country",
          "values": [
            "BN",
            "KH",
            "ID",
            "LA",
            "MY",
            "MM",
            "PH",
            "SG",
            "TH",
            "VN",
            "TL"
          ]
        },
        {
          "type": "equals",
          "key": "notIssues",
          "value": "COUNTRY_COORDINATE_MISMATCH"
        }
      ]
    },
    "highlightedFilters": [
      "q",
      "country",
      "taxonKey",
      "year",
      "datasetKey",
      "occurrenceStatus",
      "basisOfRecord",
      "locality",
      "geometry"
    ],
    "tabs": [
      "table",
      "gallery",
      "map",
      "datasets",
      "dashboard",
      "clusters",
      "download"
    ],
    "mapSettings": {
      "lat": 10.537453,
      "lng": 114.242062,
      "zoom": 4
    }
  },
  "collectionSearch": {},
  "institutionSearch": {},
  "datasetSearch": {},
  "publisherSearch": {},
  "literatureSearch": {}
};
