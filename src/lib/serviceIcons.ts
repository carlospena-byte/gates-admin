/**
 * Curated icon set for the services catalog (WiFi, toallas, sombrillas...).
 * A hand-picked subset of @tabler/icons-react rather than the full ~6,250
 * icon set — keeps the picker's search relevant (no brand logos or
 * near-duplicate variants) and the icons statically imported/tree-shaken
 * instead of pulling in the whole icon package.
 *
 * Icon component names are English (Tabler's own naming), so each option
 * carries bilingual keywords (English + Spanish) — searchServiceIcons()
 * also matches against the words baked into the icon's own name (e.g.
 * "IconRockingChair" -> "rocking", "chair"), so most English queries work
 * even without an explicit keyword.
 *
 * To add a new option: import the icon and add one entry with a few
 * keywords in both languages so it surfaces in search.
 */

import {
  IconAirConditioning,
  IconAmbulance,
  IconAnchor,
  IconArcheryArrow,
  IconArmchair,
  IconAward,
  IconBabyCarriage,
  IconBallBasketball,
  IconBallBowling,
  IconBallTennis,
  IconBallVolleyball,
  IconBarbell,
  IconBarcode,
  IconBath,
  IconBattery,
  IconBeach,
  IconBed,
  IconBike,
  IconBlind,
  IconBluetooth,
  IconBottle,
  IconBrush,
  IconBuildingCommunity,
  IconBuildingCottage,
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconBulb,
  IconCamera,
  IconCandle,
  IconCar,
  IconCarGarage,
  IconCaravan,
  IconCards,
  IconCarouselHorizontal,
  IconCertificate,
  IconChargingPile,
  IconChessKnight,
  IconClipboard,
  IconClothesRack,
  IconCoffee,
  IconCreditCard,
  IconCricket,
  IconDesk,
  IconDeviceCctv,
  IconDeviceProjector,
  IconDeviceSpeaker,
  IconDeviceTv,
  IconDice,
  IconDog,
  IconDoor,
  IconDroplet,
  IconElevator,
  IconFaceId,
  IconFence,
  IconFingerprint,
  IconFireExtinguisher,
  IconFirstAidKit,
  IconFish,
  IconFishHook,
  IconFlame,
  IconFlower,
  IconFridge,
  IconGlassFull,
  IconGolf,
  IconGrill,
  IconGuitarPick,
  IconHammer,
  IconHanger,
  IconHeadphones,
  IconIroning,
  IconKarate,
  IconKayak,
  IconKey,
  IconLadder,
  IconLamp,
  IconLeaf,
  IconLock,
  IconLuggage,
  IconMedal,
  IconMicrophone2,
  IconMicrowave,
  IconMountain,
  IconMovie,
  IconMusic,
  IconParking,
  IconPerfume,
  IconPiano,
  IconPicnicTable,
  IconPillow,
  IconPingPong,
  IconPlant,
  IconPlug,
  IconPodium,
  IconPool,
  IconPrinter,
  IconQrcode,
  IconRockingChair,
  IconRollercoaster,
  IconRouter,
  IconRun,
  IconSailboat,
  IconScissors,
  IconShieldLock,
  IconSkateboard,
  IconSnowflake,
  IconSoccerField,
  IconSofa,
  IconSolarPanel,
  IconSportBilliard,
  IconSpray,
  IconStairs,
  IconStethoscope,
  IconSun,
  IconSwimming,
  IconTag,
  IconTent,
  IconToiletPaper,
  IconToolsKitchen2,
  IconTrash,
  IconTree,
  IconTrophy,
  IconUmbrella,
  IconUsers,
  IconVacuumCleaner,
  IconVault,
  IconWalk,
  IconWallet,
  IconWashDryHang,
  IconWashMachine,
  IconWheelchair,
  IconWifi,
  IconYoga,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

export interface ServiceIconOption {
  name: string;
  Icon: TablerIcon;
  keywords: string[];
}

export const SERVICE_ICON_OPTIONS: ServiceIconOption[] = [
  { name: "IconWifi", Icon: IconWifi, keywords: ["wifi", "internet", "wireless"] },
  { name: "IconBath", Icon: IconBath, keywords: ["toallas", "toalla", "baño", "towel", "towels", "bath"] },
  {
    name: "IconWashDryHang",
    Icon: IconWashDryHang,
    keywords: ["toallas", "lavanderia", "secado", "towel", "laundry", "drying"],
  },
  { name: "IconDroplet", Icon: IconDroplet, keywords: ["agua", "regadera", "ducha", "limpieza", "water", "shower", "cleaning"] },
  { name: "IconToiletPaper", Icon: IconToiletPaper, keywords: ["baño", "sanitario", "toilet", "bathroom", "restroom"] },
  { name: "IconUmbrella", Icon: IconUmbrella, keywords: ["sombrilla", "sombra", "lluvia", "umbrella", "shade", "rain", "parasol"] },
  { name: "IconArmchair", Icon: IconArmchair, keywords: ["silla", "sillas", "sillon", "sala", "chair", "chairs", "seat", "armchair"] },
  { name: "IconRockingChair", Icon: IconRockingChair, keywords: ["mecedora", "mecedoras", "rocking chair", "rocker"] },
  { name: "IconSofa", Icon: IconSofa, keywords: ["sofa", "sala", "lounge", "couch"] },
  {
    name: "IconWheelchair",
    Icon: IconWheelchair,
    keywords: ["accesible", "silla de ruedas", "discapacidad", "wheelchair", "accessible", "disabled"],
  },
  { name: "IconPicnicTable", Icon: IconPicnicTable, keywords: ["mesa", "mesas", "picnic", "table", "tables"] },
  { name: "IconPool", Icon: IconPool, keywords: ["alberca", "piscina", "pool", "swimming pool"] },
  { name: "IconSwimming", Icon: IconSwimming, keywords: ["nadar", "alberca", "piscina", "swim", "swimming"] },
  { name: "IconBeach", Icon: IconBeach, keywords: ["playa", "arena", "beach", "sand"] },
  { name: "IconSun", Icon: IconSun, keywords: ["sol", "asoleadero", "sun", "sunbathing", "deck"] },
  {
    name: "IconSnowflake",
    Icon: IconSnowflake,
    keywords: ["aire acondicionado", "frio", "clima", "air conditioning", "cold", "climate"],
  },
  { name: "IconGrill", Icon: IconGrill, keywords: ["asador", "parrilla", "bbq", "grill", "barbecue"] },
  { name: "IconLeaf", Icon: IconLeaf, keywords: ["areas verdes", "jardin", "naturaleza", "garden", "green area", "nature", "leaf"] },
  { name: "IconTree", Icon: IconTree, keywords: ["arbol", "jardin", "areas verdes", "tree", "garden"] },
  { name: "IconFlower", Icon: IconFlower, keywords: ["jardin", "flores", "flower", "garden"] },
  { name: "IconPlant", Icon: IconPlant, keywords: ["jardin", "planta", "plant", "garden"] },
  { name: "IconBarbell", Icon: IconBarbell, keywords: ["gimnasio", "gym", "pesas", "weights", "barbell", "fitness"] },
  { name: "IconYoga", Icon: IconYoga, keywords: ["yoga", "gimnasio", "fitness"] },
  { name: "IconBallBasketball", Icon: IconBallBasketball, keywords: ["basquetbol", "cancha", "deporte", "basketball", "court", "sport"] },
  { name: "IconBallTennis", Icon: IconBallTennis, keywords: ["tenis", "cancha", "deporte", "tennis", "court", "sport"] },
  { name: "IconGolf", Icon: IconGolf, keywords: ["golf"] },
  { name: "IconBike", Icon: IconBike, keywords: ["bicicleta", "ciclismo", "bike", "bicycle", "cycling"] },
  { name: "IconDog", Icon: IconDog, keywords: ["mascotas", "perros", "pet friendly", "pet", "pets", "dog", "dogs"] },
  {
    name: "IconBabyCarriage",
    Icon: IconBabyCarriage,
    keywords: ["ninos", "niños", "juegos infantiles", "bebe", "kids", "children", "playground", "baby"],
  },
  { name: "IconMovie", Icon: IconMovie, keywords: ["cine", "salon de eventos", "entretenimiento", "movie", "cinema", "theater", "events"] },
  { name: "IconMusic", Icon: IconMusic, keywords: ["musica", "audio", "music"] },
  { name: "IconDeviceSpeaker", Icon: IconDeviceSpeaker, keywords: ["bocina", "audio", "sonido", "speaker", "sound"] },
  { name: "IconUsers", Icon: IconUsers, keywords: ["salon de eventos", "capacidad", "grupo", "event hall", "group", "capacity", "people"] },
  { name: "IconBuildingStore", Icon: IconBuildingStore, keywords: ["tienda", "convenience", "comercio", "store", "shop"] },
  { name: "IconParking", Icon: IconParking, keywords: ["estacionamiento", "parking"] },
  { name: "IconCar", Icon: IconCar, keywords: ["auto", "estacionamiento", "valet", "car"] },
  { name: "IconElevator", Icon: IconElevator, keywords: ["elevador", "ascensor", "elevator", "lift"] },
  { name: "IconStairs", Icon: IconStairs, keywords: ["escaleras", "stairs"] },
  { name: "IconDoor", Icon: IconDoor, keywords: ["puerta", "acceso", "entrada", "door", "entrance", "access"] },
  { name: "IconFence", Icon: IconFence, keywords: ["barda", "cerca", "seguridad", "fence", "security"] },
  { name: "IconKey", Icon: IconKey, keywords: ["llave", "acceso", "key", "access"] },
  { name: "IconLock", Icon: IconLock, keywords: ["candado", "seguridad", "lock", "security"] },
  { name: "IconShieldLock", Icon: IconShieldLock, keywords: ["seguridad", "vigilancia", "security", "surveillance"] },
  { name: "IconDeviceCctv", Icon: IconDeviceCctv, keywords: ["camara", "vigilancia", "seguridad", "camera", "cctv", "surveillance"] },
  { name: "IconCamera", Icon: IconCamera, keywords: ["camara", "fotos", "vigilancia", "camera", "photos"] },
  { name: "IconTrash", Icon: IconTrash, keywords: ["basura", "limpieza", "trash", "garbage", "cleaning"] },

  // Household / rental amenities (Airbnb-style amenity checklist).
  { name: "IconDeviceTv", Icon: IconDeviceTv, keywords: ["television", "tv", "pantalla", "cable"] },
  { name: "IconIroning", Icon: IconIroning, keywords: ["plancha", "planchado", "iron", "ironing"] },
  { name: "IconBlind", Icon: IconBlind, keywords: ["persianas", "cortinas", "blinds", "curtains"] },
  { name: "IconBed", Icon: IconBed, keywords: ["cama", "ropa de cama", "sabanas", "bed", "bed linens", "sheets"] },
  { name: "IconPillow", Icon: IconPillow, keywords: ["almohada", "ropa de cama", "pillow", "bed linens", "cushion"] },
  { name: "IconHanger", Icon: IconHanger, keywords: ["ganchos", "gancho", "perchero", "hanger", "hangers"] },
  { name: "IconClothesRack", Icon: IconClothesRack, keywords: ["closet", "ropero", "armario", "closet rack", "wardrobe"] },
  { name: "IconBottle", Icon: IconBottle, keywords: ["shampoo", "jabon", "amenidades de bano", "soap", "toiletries"] },
  { name: "IconSpray", Icon: IconSpray, keywords: ["limpieza", "spray", "desinfectante", "cleaning", "disinfectant"] },
  { name: "IconPerfume", Icon: IconPerfume, keywords: ["perfume", "fragancia", "fragrance"] },
  { name: "IconBrush", Icon: IconBrush, keywords: ["cepillo", "brush"] },
  { name: "IconScissors", Icon: IconScissors, keywords: ["tijeras", "kit de costura", "scissors", "sewing kit"] },
  { name: "IconToolsKitchen2", Icon: IconToolsKitchen2, keywords: ["cocina", "utensilios", "kitchen", "cookware"] },
  { name: "IconFridge", Icon: IconFridge, keywords: ["refrigerador", "nevera", "fridge", "refrigerator"] },
  { name: "IconMicrowave", Icon: IconMicrowave, keywords: ["microondas", "microwave"] },
  { name: "IconCoffee", Icon: IconCoffee, keywords: ["cafetera", "cafe", "coffee", "coffee maker"] },
  { name: "IconWashMachine", Icon: IconWashMachine, keywords: ["lavadora", "lavanderia", "washer", "washing machine", "laundry"] },
  { name: "IconVacuumCleaner", Icon: IconVacuumCleaner, keywords: ["aspiradora", "vacuum", "vacuum cleaner"] },
  { name: "IconFlame", Icon: IconFlame, keywords: ["calefaccion", "chimenea", "estufa", "heater", "fireplace", "stove"] },
  { name: "IconCandle", Icon: IconCandle, keywords: ["vela", "candle"] },
  { name: "IconDesk", Icon: IconDesk, keywords: ["escritorio", "espacio de trabajo", "desk", "workspace"] },
  { name: "IconFirstAidKit", Icon: IconFirstAidKit, keywords: ["botiquin", "primeros auxilios", "first aid", "first aid kit"] },
  { name: "IconFireExtinguisher", Icon: IconFireExtinguisher, keywords: ["extintor", "fire extinguisher"] },

  // Electronics / utilities.
  { name: "IconAirConditioning", Icon: IconAirConditioning, keywords: ["aire acondicionado", "clima", "air conditioning", "ac"] },
  { name: "IconRouter", Icon: IconRouter, keywords: ["router", "modem", "internet"] },
  { name: "IconBluetooth", Icon: IconBluetooth, keywords: ["bluetooth"] },
  { name: "IconBattery", Icon: IconBattery, keywords: ["bateria", "pilas", "battery"] },
  { name: "IconPlug", Icon: IconPlug, keywords: ["enchufe", "contacto", "plug", "outlet", "socket"] },
  { name: "IconChargingPile", Icon: IconChargingPile, keywords: ["cargador electrico", "auto electrico", "ev charger", "electric vehicle"] },
  { name: "IconSolarPanel", Icon: IconSolarPanel, keywords: ["panel solar", "energia solar", "solar panel", "solar energy"] },
  { name: "IconLamp", Icon: IconLamp, keywords: ["lampara", "luz", "lamp", "light"] },
  { name: "IconBulb", Icon: IconBulb, keywords: ["foco", "bombilla", "bulb", "lightbulb"] },
  { name: "IconPrinter", Icon: IconPrinter, keywords: ["impresora", "printer"] },
  { name: "IconDeviceProjector", Icon: IconDeviceProjector, keywords: ["proyector", "projector"] },
  { name: "IconClipboard", Icon: IconClipboard, keywords: ["portapapeles", "notas", "clipboard", "notepad"] },

  // Kitchen / dining extras.
  { name: "IconGlassFull", Icon: IconGlassFull, keywords: ["vasos", "copas", "glassware", "bar"] },

  // Finance / access & security.
  { name: "IconVault", Icon: IconVault, keywords: ["caja fuerte", "safe", "vault"] },
  { name: "IconWallet", Icon: IconWallet, keywords: ["cartera", "billetera", "wallet"] },
  { name: "IconCreditCard", Icon: IconCreditCard, keywords: ["tarjeta", "pago", "credit card", "payment"] },
  { name: "IconFingerprint", Icon: IconFingerprint, keywords: ["huella", "biometrico", "fingerprint", "biometric"] },
  { name: "IconFaceId", Icon: IconFaceId, keywords: ["reconocimiento facial", "face id", "facial recognition"] },
  { name: "IconQrcode", Icon: IconQrcode, keywords: ["codigo qr", "qr code"] },
  { name: "IconBarcode", Icon: IconBarcode, keywords: ["codigo de barras", "barcode"] },

  // Entertainment / recreation.
  { name: "IconPiano", Icon: IconPiano, keywords: ["piano"] },
  { name: "IconGuitarPick", Icon: IconGuitarPick, keywords: ["guitarra", "guitar"] },
  { name: "IconHeadphones", Icon: IconHeadphones, keywords: ["audifonos", "headphones"] },
  { name: "IconMicrophone2", Icon: IconMicrophone2, keywords: ["microfono", "karaoke", "microphone"] },
  { name: "IconPodium", Icon: IconPodium, keywords: ["podio", "salon de eventos", "podium", "stage"] },
  { name: "IconDice", Icon: IconDice, keywords: ["dados", "juegos de mesa", "dice", "board games"] },
  { name: "IconCards", Icon: IconCards, keywords: ["cartas", "naipes", "cards", "playing cards"] },
  { name: "IconChessKnight", Icon: IconChessKnight, keywords: ["ajedrez", "chess"] },
  { name: "IconSportBilliard", Icon: IconSportBilliard, keywords: ["billar", "pool table", "billiards"] },
  { name: "IconPingPong", Icon: IconPingPong, keywords: ["ping pong", "tenis de mesa", "table tennis"] },
  { name: "IconBallBowling", Icon: IconBallBowling, keywords: ["boliche", "bowling"] },
  { name: "IconKarate", Icon: IconKarate, keywords: ["artes marciales", "karate", "martial arts"] },
  { name: "IconRun", Icon: IconRun, keywords: ["correr", "trotar", "running", "jogging"] },
  { name: "IconWalk", Icon: IconWalk, keywords: ["caminar", "senderismo", "walking", "hiking"] },
  { name: "IconMountain", Icon: IconMountain, keywords: ["montaña", "senderismo", "mountain", "hiking"] },
  { name: "IconSailboat", Icon: IconSailboat, keywords: ["velero", "sailboat", "sailing"] },
  { name: "IconAnchor", Icon: IconAnchor, keywords: ["muelle", "marina", "anchor", "dock", "marina"] },
  { name: "IconKayak", Icon: IconKayak, keywords: ["kayak"] },
  { name: "IconFish", Icon: IconFish, keywords: ["pesca", "fish"] },
  { name: "IconFishHook", Icon: IconFishHook, keywords: ["pesca", "fishing", "fishing hook"] },
  { name: "IconSkateboard", Icon: IconSkateboard, keywords: ["patineta", "skateboard", "skate park"] },
  { name: "IconRollercoaster", Icon: IconRollercoaster, keywords: ["montaña rusa", "juegos mecanicos", "rollercoaster", "amusement park"] },
  { name: "IconCarouselHorizontal", Icon: IconCarouselHorizontal, keywords: ["carrusel", "carousel"] },
  { name: "IconBallVolleyball", Icon: IconBallVolleyball, keywords: ["voleibol", "volleyball"] },
  { name: "IconCricket", Icon: IconCricket, keywords: ["criquet", "cricket"] },
  { name: "IconArcheryArrow", Icon: IconArcheryArrow, keywords: ["arqueria", "archery"] },
  { name: "IconSoccerField", Icon: IconSoccerField, keywords: ["futbol", "cancha de futbol", "soccer", "soccer field"] },

  // Property types / structures.
  { name: "IconBuildingWarehouse", Icon: IconBuildingWarehouse, keywords: ["bodega", "almacen", "warehouse"] },
  { name: "IconBuildingCommunity", Icon: IconBuildingCommunity, keywords: ["comunidad", "condominio", "community"] },
  { name: "IconBuildingSkyscraper", Icon: IconBuildingSkyscraper, keywords: ["torre", "rascacielos", "skyscraper", "tower"] },
  { name: "IconBuildingCottage", Icon: IconBuildingCottage, keywords: ["cabaña", "casa de campo", "cottage"] },
  { name: "IconTent", Icon: IconTent, keywords: ["tienda de campaña", "camping", "tent"] },
  { name: "IconCaravan", Icon: IconCaravan, keywords: ["casa rodante", "caravana", "caravan", "rv"] },
  { name: "IconCarGarage", Icon: IconCarGarage, keywords: ["garage", "cochera", "garaje"] },

  // Awards / certifications.
  { name: "IconCertificate", Icon: IconCertificate, keywords: ["certificado", "certificacion", "certificate"] },
  { name: "IconAward", Icon: IconAward, keywords: ["premio", "reconocimiento", "award"] },
  { name: "IconTrophy", Icon: IconTrophy, keywords: ["trofeo", "trophy"] },
  { name: "IconMedal", Icon: IconMedal, keywords: ["medalla", "medal"] },

  // Tools / maintenance.
  { name: "IconHammer", Icon: IconHammer, keywords: ["martillo", "herramientas", "hammer", "tools", "maintenance"] },
  { name: "IconLadder", Icon: IconLadder, keywords: ["escalera", "ladder"] },

  // Health / emergency.
  { name: "IconAmbulance", Icon: IconAmbulance, keywords: ["ambulancia", "emergencia", "ambulance", "emergency"] },
  { name: "IconStethoscope", Icon: IconStethoscope, keywords: ["medico", "enfermeria", "stethoscope", "doctor", "nurse"] },

  // Travel / concierge.
  { name: "IconLuggage", Icon: IconLuggage, keywords: ["equipaje", "maletas", "luggage", "baggage", "concierge"] },
];

const ICON_MAP = new Map(SERVICE_ICON_OPTIONS.map((opt) => [opt.name, opt.Icon]));

/** Resolves a stored icon name back to its component, falling back to a generic tag icon. */
export function getServiceIcon(name: string | null | undefined): TablerIcon {
  return (name && ICON_MAP.get(name)) || IconTag;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (á, ñ doesn't have one but é/í/ó/ú do)
    .toLowerCase()
    .trim();
}

// Crude English/Spanish plural stripping so "sillas" matches "silla" and
// "chairs" matches "chair" without a full stemming library.
function stem(word: string): string {
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

// "IconRockingChair" -> ["rocking", "chair"]; "IconWifi" -> ["wifi"].
function wordsFromIconName(iconName: string): string[] {
  return iconName
    .replace(/^Icon/, "")
    .split(/(?=[A-Z])/)
    .map((w) => normalize(w))
    .filter(Boolean);
}

/**
 * Ranked icon search across icon names + keywords, matching English or
 * Spanish, singular or plural, accent-insensitive. Used by both the manual
 * icon picker's search box and the live "as you type the service name"
 * suggestions.
 */
export function searchServiceIcons(query: string, limit = 8): ServiceIconOption[] {
  const q = normalize(query);
  if (!q) return SERVICE_ICON_OPTIONS.slice(0, limit);
  const qStem = stem(q);

  const scored = SERVICE_ICON_OPTIONS.map((opt) => {
    const terms = [...wordsFromIconName(opt.name), ...opt.keywords.map(normalize)];
    let score = 0;
    for (const term of terms) {
      if (term === q) score = Math.max(score, 100);
      else if (stem(term) === qStem) score = Math.max(score, 90);
      // Prefix/substring fallbacks only kick in once both sides are long
      // enough to be meaningful — otherwise a short keyword like "kit"
      // would spuriously prefix-match an unrelated query like "kitchen".
      else if (term.length >= 4 && q.length >= 4 && (term.startsWith(q) || q.startsWith(term))) score = Math.max(score, 70);
      else if (term.length >= 4 && q.length >= 4 && (term.includes(q) || q.includes(term))) score = Math.max(score, 50);
    }
    return { opt, score };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.opt);
}
