export default async function handler(req, res) {
  // 只接受 POST
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

    // 基本檢查
    if (!address || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "請提供 address、lat、lng。",
        facilities: []
      });
    }

    // 限制半徑，避免查詢過重
    const safeRadius = Math.min(Number(radius) || 500, 1000);

    // 限制分類數量，避免一次查太多造成 timeout
    const safeCategories = Array.isArray(categories)
      ? categories.slice(0, 2)
      : [];

    if (safeCategories.length === 0) {
      return res.status(400).json({
        success: false,
        error: "NO_CATEGORIES",
        message: "請至少提供一個查詢類別。",
        facilities: []
      });
    }

    const categoryMap = {
      school: `
        node["amenity"~"school|kindergarten|college|university"](around:${safeRadius},${lat},${lng});
        way["amenity"~"school|kindergarten|college|university"](around:${safeRadius},${lat},${lng});
      `,
      transport: `
        node["highway"="bus_stop"](around:${safeRadius},${lat},${lng});
        node["railway"~"station|halt"](around:${safeRadius},${lat},${lng});
      `,
      shopping: `
        node["shop"](around:${safeRadius},${lat},${lng});
        way["shop"](around:${safeRadius},${lat},${lng});
        node["amenity"~"marketplace|supermarket"](around:${safeRadius},${lat},${lng});
      `,
      park: `
        node["leisure"="park"](around:${safeRadius},${lat},${lng});
        way["leisure"="park"](around:${safeRadius},${lat},${lng});
      `,
      medical: `
        node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${safeRadius},${lat},${lng});
        way["amenity"~"hospital|clinic|doctors|pharmacy"](around:${safeRadius},${lat},${lng});
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
      out center tags;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let overpassData;

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams({
          data: overpassQuery
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(200).json({
          success: false,
          error: "OVERPASS_ERROR",
          message: "Overpass API 回應失敗，請縮小半徑或稍後再試。",
          query: {
            address,
            lat,
            lng,
            radius: safeRadius,
            categories: safeCategories
          },
          facilities: []
        });
      }

      overpassData = await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      return res.status(200).json({
        success: false,
        error: "QUERY_TIMEOUT_OR_FAILED",
        message: "周邊機能查詢逾時或失敗，請縮小半徑或減少分類後再試。",
        query: {
          address,
          lat,
          lng,
          radius: safeRadius,
          categories: safeCategories
        },
        facilities: []
      });
    }

    const facilities = [];

    for (const item of overpassData.elements || []) {
      const name = item.tags?.name;
      if (!name) continue;

      const itemLat = item.lat || item.center?.lat;
      const itemLng = item.lon || item.center?.lon;

      if (!itemLat || !itemLng) continue;

      const category = detectCategory(item.tags);

      facilities.push({
        category,
        name,
        distance_meters: Math.round(getDistanceMeters(lat, lng, itemLat, itemLng)),
        lat: itemLat,
        lng: itemLng
      });
    }

    // 去除重複名稱
    const uniqueFacilities = [];
    const seen = new Set();

    for (const item of facilities) {
      const key = `${item.category}-${item.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueFacilities.push(item);
    }

    // 依距離排序，每類最多 5 筆
    const limitedFacilities = [];

    for (const cat of safeCategories) {
      const group = uniqueFacilities
        .filter((item) => item.category === cat || item.category === "other")
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 5);

      limitedFacilities.push(...group);
    }

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
      note: limitedFacilities.length > 0
        ? "查詢完成。距離為系統依座標估算之直線距離，實際路程仍以地圖導航為準。"
        : "查詢完成，但指定範圍內未取得符合條件的設施資料。"
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: "SERVER_ERROR",
      message: "伺服器處理失敗，請稍後再試。",
      facilities: []
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
