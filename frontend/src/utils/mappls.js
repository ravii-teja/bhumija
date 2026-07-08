let mapplsLoadPromise = null;

export function loadMapplsSdk(accessToken) {
  if (typeof window !== 'undefined' && window.mappls) {
    return Promise.resolve(window.mappls);
  }

  if (mapplsLoadPromise) {
    return mapplsLoadPromise;
  }

  mapplsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mappls-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.mappls));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${accessToken}`;
    script.async = true;
    script.dataset.mapplsSdk = 'true';
    script.onload = () => {
      if (window.mappls) {
        resolve(window.mappls);
      } else {
        reject(new Error('Mappls SDK loaded but mappls global is missing'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Mappls SDK'));
    document.head.appendChild(script);
  });

  return mapplsLoadPromise;
}

export function findDistrictByCoords(districts, lat, lon, threshold = 1.5) {
  if (!districts?.length) return null;

  let nearest = null;
  let minDist = Infinity;

  districts.forEach((district) => {
    const dist = Math.sqrt((district.lat - lat) ** 2 + (district.lon - lon) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = district;
    }
  });

  if (!nearest) return null;
  if (minDist < threshold) return nearest;

  // Soft match: still show nearest vulnerable district crops/advisory when GPS is slightly outside bounds
  return { ...nearest, approximateMatch: true };
}
