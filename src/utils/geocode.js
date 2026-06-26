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
  if (!address) {
    console.warn('[geocode] Adresse vide pour', property.id, property.nom_bien);
    return null;
  }

  const cached = cache.get(address);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    console.log('[geocode] Requête Nominatim:', address);

    const res = await fetch(url, { headers: { 'User-Agent': 'SipaAnalyzer/1.0' } });

    if (!res.ok) {
      console.warn('[geocode] Erreur HTTP', res.status, 'pour', address);
      return null;
    }

    const data = await res.json();

    if (data.length === 0) {
      console.warn('[geocode] Aucun résultat pour:', address);
      return null;
    }

    const result = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    console.log('[geocode] Trouvé:', address, '->', result.latitude, result.longitude);
    cache.set(address, result);
    return result;
  } catch (err) {
    console.warn('[geocode] Erreur réseau pour', address, err);
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
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}
