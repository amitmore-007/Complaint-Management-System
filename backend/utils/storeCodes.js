export const STORE_CODE_MAP = {
  Magarpatta: "MAG",
  Kharadi: "KHA",
  "Viman Nagar": "VMN",
  Wagholi: "WAG",
  "Koregaon Park": "KRP",
  "MG Road": "MGR",
  "Salunkhe Vihar": "SLV",
  "JM Road": "JMR",
  Aundh: "AUN",
  "Pimple Saudagar": "PMS",
  Balewadi: "BLW",
  Chinchwad: "CHN",
  Ravet: "RAV",
  Wakad: "WAK",
  "Happiness Street": "HPS",
  Kothrud: "KOT",
  "Sinhgad Road": "SNR",
  Hinjewadi: "HNJ",
  Undri: "UND",
  Dhanori: "DHN",
  Warje: "WRJ",
  Bibwewadi: "BBW",
  Bavdhan: "BVD",
};

const fallbackStoreCode = (storeName) => {
  const cleaned = String(storeName || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "OTH";

  const firstToken = cleaned.split(" ")[0] || cleaned;
  const alpha = firstToken.replace(/[^A-Za-z]/g, "");
  const code = alpha.slice(0, 3).toUpperCase();
  return code.length === 3 ? code : (code + "XXX").slice(0, 3);
};

export const getStoreCode = (storeName) => {
  const cleaned = String(storeName || "").trim();
  return STORE_CODE_MAP[cleaned] || fallbackStoreCode(cleaned);
};
