function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function classifyFacility(tags = {}) {
  if (tags.amenity === "school") return "學校";
  if (tags.amenity === "kindergarten") return "幼兒園";
  if (tags.shop === "convenience") return "便利商店";
  if (tags.shop === "supermarket") return "超市";
  if (tags.amenity === "marketplace") return "市場";
  if (tags.leisure === "park") return "公園";
  if (tags.amenity === "hospital") return "醫院";
  if (tags.amenity === "clinic") return "診所";
  if (tags.amenity === "pharmacy") return "藥局";
  if (tags.amenity === "bank") return "銀行";
  if (tags.amenity === "post_office") return "郵局";
  if (tags.amenity === "parking") return "停車場";
  if (tags.railway === "station") return "車站";
  if (tags.highway === "bus_stop") return "公車站";
  if (tags.amenity === "restaurant") return "餐飲";
  return "其他";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method is allowed" });
  }

  try {
    const { address, radius = 500 } = req.body || {};

    if (!address) {
      return res.status(400).json({ error: "address is required" });
    }

    // 1. 地址轉經緯度：先用免費 OSM Nominatim
    const geoUrl =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: address,
        format: "json",
        limit: "1",
        countrycodes: "tw",
        addressdetails: "1"
      });

    const geoResponse = await fetch(geoUrl, {
      headers: {
        "User-Agent": "real-estate-nearby-api/1.0"
      }
    });

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return res.status(404).json({
        error: "找不到地址座標",
        message: "請確認地址是否完整，例如：彰化縣員林市莒光路364號"
      });
    }

    const lat = Number(geoData[0].lat);
    const lon = Number(geoData[0].lon);

    // 2. 查 500 公尺內生活機能：Overpass API
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"school|kindergarten|hospital|clinic|pharmacy|bank|post_office|parking|restaurant|marketplace"](around:${radius},${lat},${lon});
        node["shop"~"convenience|supermarket"](around:${radius},${lat},${lon});
        node["leisure"="park"](around:${radius},${lat},${lon});
        node["railway"="station"](around:${radius},${lat},${lon});
        node["highway"="bus_stop"](around:${radius},${lat},${lon});
      );
      out center tags;
    `;

    const overpassResponse = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ data: query })
    });

    const overpassData = await overpassResponse.json();

    const facilities = (overpassData.elements || [])
      .map((item) => {
        const name =
          item.tags?.name ||
          item.tags?.["name:zh"] ||
          item.tags?.["name:zh-TW"] ||
          "";

        if (!name) return null;

        const distance_m = haversineDistance(lat, lon, item.lat, item.lon);

        return {
          name,
          category: classifyFacility(item.tags),
          distance_m,
          lat: item.lat,
          lon: item.lon
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 40);

    return res.status(200).json({
      input_address: address,
      matched_address: geoData[0].display_name,
      radius,
      location: {
        lat,
        lon
      },
      facilities,
      note: "資料來源為 OpenStreetMap / Overpass，實際設施仍建議以現場與官方資料確認。"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}