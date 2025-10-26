var siteTheme = gbifReactComponents.themeBuilder.extend({
  baseTheme: 'light', extendWith: {
    primary: themeStyle.colors.primary
  }
});

var siteConfig = {
  version: 2,
  routes: {
    alwaysUseHrefs: true, // Update - there now is translations. since the site isn't translated we can use push for now. if true, then we will always use hrefs, if false we will use onClick events and push state to the history. I've added this because I just realize that the language picker doesn't work with pushState as the url of the translated site is not updated with the new url
    //enabledRoutes: ['occurrenceSearch', 'literatureSearch'],
    enabledRoutes: ['occurrenceSearch', 'collectionSearch', 'collectionKey', 'institutionSearch', 'institutionKey', 'literatureSearch'],
  }, // Highlight Maps : Kit Elloran
  occurrence: { // Start Occurrence function
    occurrenceSearchTabs: ['TABLE', 'GALLERY', 'MAP', 'DATASETS', 'DASHBOARD', 'CLUSTERS'],
    highlightedFilters: ['q', 'country', 'taxonKey', 'year', 'datasetKey', 'occurrenceStatus', 'basisOfRecord', 'locality', 'geometry'],
    //highlightedFilters: ['q', 'country', 'publishingCountry', 'institutionKey', 'collectionKey', 'datasetKey', 'taxonKey', 'publishingOrg', 'hostingOrganizationKey', 'networkKey', 'gadmGid', 'institutionCode', 'collectionCode', 'recordNumber', 'establishmentMeans', 'sex', 'lifeStage', 'license', 'basisOfRecord', 'mediaType', 'month', 'continent', 'protocol', 'dwcaExtension', 'iucnRedListCategory', 'typeStatus', 'issue', 'occurrenceStatus', 'projectId', 'recordedById', 'identifiedById', 'occurrenceId', 'organismId', 'higherGeography', 'eventId', 'fieldNumber', 'isInCluster', 'isSequenced', 'year', 'coordinateUncertaintyInMeters', 'depth', 'organismQuantity', 'relativeOrganismQuantity', 'sampleSizeValue', 'elevation', 'catalogNumber', 'preparations', 'sampleSizeUnit', 'locality', 'waterBody', 'stateProvince', 'datasetId', 'samplingProtocol', 'verbatimScientificName', 'recordedBy', 'identifiedBy', 'geometry', 'eventDate']
    rootPredicate: {
      "type": "and",
      "predicates": [
        {
          "type": "in",
          "key": "country",
          "values": ["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "VN", "TL"]
        },
        {
          "type": "equals",
          "key": "notIssues",
          "value": "COUNTRY_COORDINATE_MISMATCH"
        }
      ]
    }, // End Occurrence Function
    mapSettings: { // ASEAN Map configurations and zoom level
      lat: 10.537453, // Latitude of Map
      lng: 114.242062, // Longitude of Map
      zoom: 4 // Level of zoom adjusted to 4
    },//, // ACB : a30d7f59-d3d4-4e89-97dc-de9cf837f591
    // You probably need help to configure the scope - so just ask
    // for his demo site we only show Fungi (taxonKey=5). It use the predicate structure known from GBIF download API. 
    // See https://www.gbif.org/developer/occurrence (long page without enough anchors - search for "Occurrence Download Predicates")
    // The format is however slightly different, in that is use camelCase for keys instead of CONSTANT_CASE. 
    
    /* Module for statistics home page */
    /* START CONFIG 
    predicate: 
     { 
      "type": "equals", 
      "key": "country", 
      "values": ["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "VN", "TL"]
    }
    END CONFIG */
    //rootPredicate: { type: 'equals', key: 'publisher', value: '2b7c7b4f-4d4f-40d3-94de-c28b6fa054a6' }, 
    // occurrenceSearchTabs: ['MAP', 'TABLE', 'GALLERY', 'DATASETS'] // what tabs should be shown
    // see https://hp-theme.gbif-staging.org/data-exploration-config for more options
  }
};
