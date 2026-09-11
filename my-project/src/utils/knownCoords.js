export const KNOWN_COORDS = {
  // Odisha
  salipur: { lat: 20.4795, lon: 86.1306 },
  salepur: { lat: 20.4795, lon: 86.1306 },
  cuttack: { lat: 20.4625, lon: 85.8828 },
  bhubaneswar: { lat: 20.2961, lon: 85.8245 },
  puri: { lat: 19.8135, lon: 85.8312 },
  rourkela: { lat: 22.2604, lon: 84.8536 },
  sambalpur: { lat: 21.4669, lon: 83.9812 },
  berhampur: { lat: 19.3149, lon: 84.7941 },
  balasore: { lat: 21.4934, lon: 86.9135 },
  bhadrak: { lat: 21.0543, lon: 86.5165 },
  baripada: { lat: 21.9348, lon: 86.7329 },
  jeypore: { lat: 18.8557, lon: 82.5684 },
  angul: { lat: 20.8398, lon: 85.1017 },
  dhenkanal: { lat: 20.6653, lon: 85.5967 },
  jharsuguda: { lat: 21.8555, lon: 84.0062 },
  kendrapara: { lat: 20.4996, lon: 86.4230 },
  jagatsinghpur: { lat: 20.2646, lon: 86.1685 },

  // Major Metros & States
  delhi: { lat: 28.6139, lon: 77.2090 },
  newdelhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  pune: { lat: 18.5204, lon: 73.8567 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  indore: { lat: 22.7196, lon: 75.8577 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  patna: { lat: 25.5941, lon: 85.1376 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  surat: { lat: 21.1702, lon: 72.8311 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  varanasi: { lat: 25.3176, lon: 82.9739 },
  srinagar: { lat: 34.0837, lon: 74.7973 },
  amritsar: { lat: 31.6340, lon: 74.8723 },
  goa: { lat: 15.2993, lon: 74.1240 },
  vadodara: { lat: 22.3072, lon: 73.1812 },
  rajkot: { lat: 22.3039, lon: 70.8022 },
  kanpur: { lat: 26.4499, lon: 80.3319 },
  agra: { lat: 27.1767, lon: 78.0081 },
  prayagraj: { lat: 25.4358, lon: 81.8463 },
  allahabad: { lat: 25.4358, lon: 81.8463 },
  meerut: { lat: 28.9845, lon: 77.7064 },
  ghaziabad: { lat: 28.6692, lon: 77.4538 },
  noida: { lat: 28.5355, lon: 77.3910 },
  gurugram: { lat: 28.4595, lon: 77.0266 },
  gurgaon: { lat: 28.4595, lon: 77.0266 },
  faridabad: { lat: 28.4089, lon: 77.3178 },
  mysore: { lat: 12.2958, lon: 76.6394 },
  mysuru: { lat: 12.2958, lon: 76.6394 },
  mangalore: { lat: 12.9141, lon: 74.8560 },
  mangaluru: { lat: 12.9141, lon: 74.8560 },
  kozhikode: { lat: 11.2588, lon: 75.7804 },
  thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
  trivandrum: { lat: 8.5241, lon: 76.9366 },
  madurai: { lat: 9.9252, lon: 78.1198 },
  trichy: { lat: 10.7905, lon: 78.7047 },
  salem: { lat: 11.6643, lon: 78.1460 },
  vijayawada: { lat: 16.5062, lon: 80.6480 },
  guntur: { lat: 16.3067, lon: 80.4365 },
  ranchi: { lat: 23.3441, lon: 85.3096 },
  jamshedpur: { lat: 22.8046, lon: 86.2029 },
  dhanbad: { lat: 23.7957, lon: 86.4304 },
  guwahati: { lat: 26.1445, lon: 91.7362 },
  shillong: { lat: 25.5788, lon: 91.8933 },
  dehradun: { lat: 30.3165, lon: 78.0322 },
  shimla: { lat: 31.1048, lon: 77.1734 },
};

/**
 * Geocode a location query string with English language priority & Indian location disambiguation
 */
export async function geocodeLocation(query) {
  if (!query || !query.trim()) return null;
  const clean = query.trim().toLowerCase().replace(/\s+/g, '');
  if (KNOWN_COORDS[clean]) {
    return KNOWN_COORDS[clean];
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=10&language=en`
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Prioritize Indian results if user searched an Indian city/village
      const inMatch = data.results.find((r) => r.country_code === 'IN');
      const chosen = inMatch || data.results[0];
      return {
        lat: chosen.latitude,
        lon: chosen.longitude,
        name: chosen.name,
        country: chosen.country,
      };
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }
  return null;
}
