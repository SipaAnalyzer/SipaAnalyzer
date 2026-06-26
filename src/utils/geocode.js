const cache = new Map();

function buildAddress(property) {
  const parts = [
    property.adresse,
    property.ville,
    property.canton,
    'Suisse',
  ].filter(Boolean);
  return parts.join(', ');
}

export async function geocodeProperty(property) {
  const address = buildAddress(property);
  if (!address) return null;

  const cached = cache.get(address);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'SipaAnalyzer/1.0' } }
    );

    if (!res.ok) return null;

    const data = await res.json();

    if (data.length === 0) {
      cache.set(address, null);
      return null;
    }

    const result = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    cache.set(address, result);
    return result;
  } catch {
    return null;
  }
}

export async function geocodeProperties(properties, onProgress) {
  const results = [];

  for (let i = 0; i < properties.length; i++) {
    const coords = await geocodeProperty(properties[i]);
    if (coords) {
      results.push({ id: properties[i].id, ...coords });
    }
    if (onProgress) onProgress(i + 1, properties.length);
    await new Promise((r) => setTimeout(r, 1100));
  }

  return results;
}
