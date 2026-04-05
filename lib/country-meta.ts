const FLAG_CODES: Record<string, string> = {
  "Россия": "RU",
  "Германия": "DE",
  "Чехия": "CZ",
  "Бельгия": "BE",
  "Литва": "LT",
  "Польша": "PL",
  "Тайланд": "TH",
  "Вьетнам": "VN",
  "Япония": "JP",
  "Мексика": "MX",
  "Нидерланды": "NL",
  "Испания": "ES",
  "Италия": "IT",
  "Ирландия": "IE",
  "Франция": "FR",
  "Великобритания": "GB",
  "Латвия": "LV",
  "Белоруссия": "BY",
  "Китай": "CN",
  "Корея": "KR",
  "Австрия": "AT",
  "Казахстан": "KZ",
  "Армения": "AM",
  "Узбекистан": "UZ",
  "Бразилия": "BR",
  "Канада": "CA",
  "Дания": "DK",
  "Шотландия": "GB-SCT",
  "Эстония": "EE",
  "Малайзия": "MY",
  "Тайвань": "TW",
  "США": "US",
  "Австралия": "AU",
  "Грузия": "GE",
  "Словакия": "SK",
};

export function getFlagSrc(country: string): string {
  const key = country.trim();
  const code = FLAG_CODES[key] || "UN";
  return code === "GB-SCT" ? "/flags/GB.svg" : `/flags/${code}.svg`;
}
