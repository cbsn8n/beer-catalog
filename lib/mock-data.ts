export interface Beer {
  id: number;
  name: string;
  country: string;
  type: string;
  rating: number;
  price: number;
  image: string;
}

const beerNames = [
  "Paulaner Hefe-Weißbier", "Pilsner Urquell", "Augustiner Helles",
  "Guinness Draught", "Chimay Blue", "Weihenstephaner Vitus",
  "Duvel", "Hoegaarden", "Estrella Damm", "Peroni Nastro Azzurro",
  "Asahi Super Dry", "Singha", "Tiger Beer", "Kronenbourg 1664",
  "Modelo Especial", "Leffe Blonde", "Erdinger Weissbier",
  "Franziskaner Weissbier", "Krombacher Pils", "Warsteiner Premium",
  "Spaten Münchner Hell", "Bitburger Premium Pils", "Heineken Original",
  "Stella Artois", "Budweiser Budvar", "Kozel Premium",
  "Žatecký Gus", "Staropramen", "Berliner Kindl", "Tsingtao",
  "Chang Beer", "Bintang Pilsener", "Victoria Bitter", "Sapporo Premium",
  "Baltika 7", "Obolon Premium", "Lvivske", "Kirin Ichiban",
  "San Miguel Pale Pilsen", "Efes Pilsen", "Tuborg Gold",
  "Carlsberg Pilsner", "Grolsch Premium Lager", "Birra Moretti",
  "Nastro Azzurro", "Mahou Cinco Estrellas", "Alhambra Reserva 1925",
  "Cruzcampo", "Sagres", "Super Bock",
];

const countries = [
  "Германия", "Чехия", "Бельгия", "Ирландия", "Япония",
  "Мексика", "Нидерланды", "Испания", "Италия", "Таиланд",
];

const types: Beer["type"][] = [
  "Лагер", "Пшеничка", "Хеллес", "Пилснер", "Темное", "Прочее",
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const mockBeers: Beer[] = beerNames.map((name, i) => ({
  id: i + 1,
  name,
  country: countries[Math.floor(seededRandom(i + 1) * countries.length)],
  type: types[Math.floor(seededRandom(i + 100) * types.length)],
  rating: Math.round((5 + seededRandom(i + 200) * 5) * 10) / 10,
  price: Math.round((80 + seededRandom(i + 300) * 920) * 100) / 100,
  image: `https://placehold.co/300x400/f5f0e8/78716c?text=${encodeURIComponent(name.split(" ")[0])}`,
}));
