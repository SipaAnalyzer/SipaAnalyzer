import { supabase } from '@/api/supabaseClient';

const SARON_CACHE_KEY = 'saron_rate_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000;

let memoryCache = null;

export async function fetchSaronRate() {
  const cached = getCached();
  if (cached !== null) return cached;

  try {
    const { data, error } = await supabase.functions.invoke('saron-rate', {
      method: 'GET',
    });

    if (error) throw new Error(error.message || 'Function invoke failed');
    if (!data?.success) throw new Error(data?.error || 'Failed to fetch SARON');

    const rate = data.data?.rate_pct;
    if (rate === undefined || rate === null) throw new Error('No rate in response');

    setCache(rate);
    return rate;
  } catch (err) {
    console.warn('SARON fetch failed, using fallback:', err.message);
    return getFallback();
  }
}

function getCached() {
  if (memoryCache !== null) return memoryCache;
  try {
    const raw = localStorage.getItem(SARON_CACHE_KEY);
    if (raw) {
      const { rate, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) {
        memoryCache = rate;
        return rate;
      }
      localStorage.removeItem(SARON_CACHE_KEY);
    }
  } catch {}
  return null;
}

function setCache(rate) {
  memoryCache = rate;
  try {
    localStorage.setItem(SARON_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
  } catch {}
}

function getFallback() {
  return -0.04;
}
