// Busca a rota real (OSRM, gratuito, sem API key) entre 2 pontos "lng,lat".
// Retorna a rota (geometry + distance + duration) ou null se falhar.
export async function buscarRotaOSRM(start, end) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`);
    const data = await r.json();
    return data.routes?.[0] || null;
  } catch { return null; }
}
