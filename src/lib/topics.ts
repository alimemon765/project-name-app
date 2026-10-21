// Topic labels (data/topics.json, CC0) + glyph shapes for the register. Colour lives in tokens (topic-N).
export const TOPICS: Record<number, string> = {
  1: "Compound flooding",
  2: "Storm surge and waves",
  3: "Sea-level rise and tides",
  4: "Subsidence",
  5: "Coastal erosion",
  6: "Coastal geotechnics",
  7: "Extreme value analysis",
  8: "Climate variability",
  9: "Flood risk",
  10: "Climate adaptation",
  11: "Modelling and machine learning",
  12: "Remote sensing and forecasting",
  13: "Hydrology",
};
export const TOPIC_IDS = Object.keys(TOPICS).map(Number);
export const GLYPHS: Record<number, string> = {
  1: '<circle cx="5" cy="5" r="4"/>', 2: '<rect x="1.2" y="1.2" width="7.6" height="7.6"/>', 3: '<path d="M5 .8 9.3 9H.7z"/>',
  4: '<path d="M5 .5 9.5 5 5 9.5.5 5z"/>', 5: '<path d="M.7 1h8.6L5 9.2z"/>', 6: '<path d="M5 .6 9.4 3.8 7.7 9H2.3L.6 3.8z"/>',
  7: '<path d="M2.6.8h4.8L9.8 5 7.4 9.2H2.6L.2 5z"/>', 8: '<path d="M3.6 .6h2.8v3h3v2.8h-3v3H3.6v-3h-3V3.6h3z"/>',
  9: '<path d="M1.6 .2 5 3.6 8.4.2l1.4 1.4L6.4 5l3.4 3.4-1.4 1.4L5 6.4 1.6 9.8.2 8.4 3.6 5 .2 1.6z"/>',
  10: '<path fill-rule="evenodd" d="M5 .6a4.4 4.4 0 1 1 0 8.8A4.4 4.4 0 0 1 5 .6zm0 2.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/>',
  11: '<path d="M.6 6a4.4 4.4 0 0 1 8.8 0z"/>', 12: '<rect x=".6" y="3.4" width="8.8" height="3.2"/>',
  13: '<path d="M5 0l1.3 3.7L10 5 6.3 6.3 5 10 3.7 6.3 0 5l3.7-1.3z"/>',
};
export const MONOGRAM: Record<string, string> = {
  Copernicus: "Co", AGU: "AG", Elsevier: "El", Wiley: "Wi", IOP: "IO", "Nature Portfolio": "Na", Springer: "Sp", Preprints: "Pr",
  AMS: "AM", ASCE: "AS", IEEE: "IE", Science: "Sc", PNAS: "PN", "Open access": "OA", Other: "··",
};
