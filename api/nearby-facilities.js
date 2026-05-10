export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Only POST method is allowed.",
      facilities: []
    });
  }

  try {
    const { address, lat, lng, radius = 500, categories = [] } = req.body || {};

    if (!address || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "請提供 address、lat、lng。",
        facilities: []
      });
    }

    const safeRadius = Math.min(Math.max(Number(radius) || 500, 100), 500);

const allowedCategories = ["school", "transport", "shopping", "park", "medical"];

const rawCategories = Array.isArray(categories) && categories.length > 0
  ? categories
  : allowedCategories;

const safeCategories = [...new Set(rawCategories)]
  .filter((category) => allowedCategories.includes(category))
  .slice(0, 5);

if (safeCategories.length === 0) {
  return res.status(400).json({
    success: false,
    error: "NO_CATEGORIES",
    message: "請至少提供一個有效查詢類別。支援 school、transport、shopping、park、medical。",
    facilities: []
  });
}
    const categoryMap = {
      school: `
        node["amenity"~"school|kindergarten|college|university"](around:${safeRadius},${lat},${lng});
        way["amenity"~"school|kindergarten|college|university"](around:${safeRadius},${lat},${lng});
        relation["amenity"~"school|kindergarten|college|university"](around:${safeRadius},${lat},${lng});
      `,
      transport: `
        node["highway"="bus_stop"](around:${safeRadius},${lat},${lng});
        node["railway"~"station|halt"](around:${safeRadius},${lat},${lng});
        way["railway"~"station|halt"](around:${safeRadius},${lat},${lng});
      `,
      shopping: `
        node["shop"](around:${safeRadius},${lat},${lng});
        way["shop"](around:${safeRadius},${lat},${lng});
        node["amenity"~"marketplace|supermarket"](around:${safeRadius},${lat},${lng});
        way["amenity"~"marketplace|supermarket"](around:${safeRadius},${lat},${lng});
      `,
      park: `
        node["leisure"="park"](around:${safeRadius},${lat},${lng});
        way["leisure"="park"](around:${safeRadius},${lat},${lng});
        relation["leisure"="park"](around:${safeRadius},${lat},${lng});
      `,
      medical: `
        node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${safeRadius},${lat},${lng});
        way["amenity"~"hospital|clinic|doctors|pharmacy"](around:${safeRadius},${lat},${lng});
        relation["amenity"~"hospital|clinic|doctors|pharmacy"](around:${safeRadius},${lat},${lng});
      `
    };

    const queryParts = safeCategories
      .map((cat) => categoryMap[cat])
      .filter(Boolean)
      .join("\n");

    if (!queryParts) {
      return res.status(400).json({
        success: false,
        error: "UNSUPPORTED_CATEGORY",
        message: "查詢類別不支援，請使用 school、transport、shopping、park、medical。",
        facilities: []
      });
    }

    const overpassQuery = `
[out:json][timeout:8];
(
${queryParts}
);
out center;
`;

    let overpassData = null;
    let lastOverpassError = null;

    const overpassEndpoints = [
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter"
    ];

    for (const endpoint of overpassEndpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "*/*",
            "User-Agent": "real-estate-nearby-api/1.0 (https://jinjhan-hub.github.io/real-estate-gpt-knowledge/privacy-policy.html)",
            "Referer": "https://jinjhan-hub.github.io/real-estate-gpt-knowledge/privacy-policy.html"
          },
          body: "data=" + encodeURIComponent(overpassQuery),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();

          lastOverpassError = {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            body: errorText.slice(0, 300)
          };

          continue;
        }

        overpassData = await response.json();
        break;

      } catch (error) {
        clearTimeout(timeoutId);

        lastOverpassError = {
          endpoint,
          status: "FETCH_FAILED",
          statusText: error.name || "FetchError",
          body: error.message || "Overpass request failed"
        };

        continue;
      }
    }

    if (!overpassData) {
      return res.status(200).json({
        success: false,
        error: "OVERPASS_ERROR",
        message: "Overpass API 回應失敗，請縮小半徑或稍後再試。",
        overpassEndpoint: lastOverpassError?.endpoint || null,
        overpassStatus: lastOverpassError?.status || null,
        overpassStatusText: lastOverpassError?.statusText || null,
        overpassBody: lastOverpassError?.body || null,
        query: {
          address,
          lat,
          lng,
          radius: safeRadius,
          categories: safeCategories
        },
        facilities: [],
        summary: buildFacilitySummary([], safeRadius)
      });
    }

    const facilities = [];

    for (const item of overpassData.elements || []) {
  const name = item.tags?.name;
  if (!name) continue;

  const itemLat = item.lat || item.center?.lat;
  const itemLng = item.lon || item.center?.lon;

  if (!itemLat || !itemLng) continue;

  const distanceMeters = Math.round(getDistanceMeters(lat, lng, itemLat, itemLng));

  if (distanceMeters > safeRadius) continue;

  const category = detectCategory(item.tags);

  facilities.push({
    category,
    name,
    distance_meters: distanceMeters,
    lat: itemLat,
    lng: itemLng
  });
}

    const uniqueFacilities = [];
    const seen = new Set();

    for (const item of facilities) {
      const key = `${item.category}-${item.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueFacilities.push(item);
    }

    const limitedFacilities = [];

    for (const cat of safeCategories) {
      const group = uniqueFacilities
        .filter((item) => item.category === cat)
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 5);

      limitedFacilities.push(...group);
    }

    const summary = buildFacilitySummary(limitedFacilities, safeRadius);

    return res.status(200).json({
      success: true,
      query: {
        address,
        lat,
        lng,
        radius: safeRadius,
        categories: safeCategories
      },
      facilities: limitedFacilities,
      summary,
      note: limitedFacilities.length > 0
        ? "查詢完成。距離為系統依座標估算之直線距離，實際路程仍以地圖導航為準。"
        : "查詢完成，但指定範圍內未取得符合條件的設施資料。"
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: "SERVER_ERROR",
      message: "伺服器處理失敗，請稍後再試。",
      detail: error.message || "Unknown server error",
      facilities: [],
      summary: "周邊機能查詢失敗，請稍後再試，或縮小查詢半徑、減少查詢分類。"
    });
  }
}

function detectCategory(tags = {}) {
  if (tags.amenity) {
    if (["school", "kindergarten", "college", "university"].includes(tags.amenity)) {
      return "school";
    }

    if (["hospital", "clinic", "doctors", "pharmacy"].includes(tags.amenity)) {
      return "medical";
    }

    if (["marketplace", "supermarket"].includes(tags.amenity)) {
      return "shopping";
    }
  }

  if (tags.highway === "bus_stop" || tags.railway) {
    return "transport";
  }

  if (tags.shop) {
    return "shopping";
  }

  if (tags.leisure === "park") {
    return "park";
  }

  return "other";
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function buildFacilitySummary(facilities, radius) {
  if (!facilities || facilities.length === 0) {
    return `周邊機能｜${radius} 公尺內

指定範圍內未取得符合條件的設施資料。

備註：查詢結果依 OpenStreetMap / Overpass API 資料回傳，若資料不足，請以 Google Maps 或實地查證為準。`;
  }

  const categoryLabels = {
    transport: "交通機能",
    shopping: "採買機能",
    school: "學校機能",
    park: "公園綠地",
    medical: "醫療機能",
    other: "其他機能"
  };

  const grouped = {};

  for (const item of facilities) {
    const category = item.category || "other";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }

  const lines = [`周邊機能｜${radius} 公尺內`, ""];

  for (const [category, items] of Object.entries(grouped)) {
    lines.push(categoryLabels[category] || category);

    for (const item of items) {
      lines.push(`・${item.name}｜約 ${item.distance_meters} 公尺`);
    }

    lines.push("");
  }

  lines.push("備註：距離為系統依座標估算之直線距離，實際路程仍以地圖導航為準。");

  return lines.join("\n");
}
