const cache = new Map();
const EMPTY_LOCATION_VALUES = new Set(['na', 'n/a', 'n.a', 'nc', 'n.c', 'non renseigne', 'non renseigné', '-', '--']);

function cleanLocationPart(value) {
  const text = String(value || '').trim();
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return !text || EMPTY_LOCATION_VALUES.has(normalized) ? '' : text;
}

function buildAddresses(property) {
  const adresse = cleanLocationPart(property.adresse);
  const ville = cleanLocationPart(property.ville);
  const canton = cleanLocationPart(property.canton);
  const city = [ville, canton].filter(Boolean).join(', ');

  const queries = [];

  if (adresse && ville) {
    queries.push(`${adresse}, ${ville}, Suisse`);
    queries.push(`${adresse}, ${city}`);
  }

  if (ville) {
    queries.push(`${ville}, ${canton ? `${canton}, ` : ''}Suisse`);
    queries.push(city);
    queries.push(ville);
  }

  return [...new Set(queries)];
}

async function tryGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ch`;
  console.log('[geocode] Requête Nominatim:', query);

  const res = await fetch(url, { headers: { 'User-Agent': 'SipaAnalyzer/1.0' } });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.length === 0) {
    console.warn('[geocode] Aucun résultat pour:', query);
    return null;
  }

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}

export async function geocodeProperty(property) {
  const queries = buildAddresses(property);

  if (queries.length === 0) {
    console.warn('[geocode] Adresse vide pour', property.id, property.nom_bien);
    return null;
  }

  const cacheKey = queries[0];
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  for (const query of queries) {
    const result = await tryGeocode(query);
    if (result) {
      console.log('[geocode] Trouvé:', query, '->', result.latitude, result.longitude);
      cache.set(cacheKey, result);
      return result;
    }
  }

  console.warn('[geocode] Aucune requête n\'a trouvé de résultat pour', property.nom_bien);
  return null;
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
