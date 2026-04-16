// Cervecería Malafama — Product Data Store
const PRODUCTS = [
  // ===== IN-STOCK: CANS =====
  {
    id: 1,
    name: "La Santa",
    subtitle: "New England IPA | 473ml",
    category: "ipa",
    style: "neipa",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "6.5%",
    titleColor: "#c0392b",
    accentColor: "#4a7c59",
    bgColor: "#ffffff",
    image: "img/latas/la-santa.png",
    illustration: "img/ilustraciones/la-santa.png",
    slug: "la-santa",
    description: "New England IPA especial para St. Patricks. Single Hop Mosaic.",
    servingTemp: "4-7°C",
    flavorNotes: ["Tropical", "Mosaic", "Jugosa"]
  },
  {
    id: 2,
    name: "A Lo Bestia",
    subtitle: "Sour | 473ml",
    category: "sour",
    style: "sour",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 220,
    itauPrice: 187,
    abv: "5.0%",
    titleColor: "#e8734a",
    accentColor: "#d4856a",
    bgColor: "#fcecdb",
    image: "img/latas/a-lo-bestia.webp",
    illustration: "img/ilustraciones/a-lo-bestia.png",
    slug: "a-lo-bestia",
    description: "Cerveza ácida con durazno, maracuyá y naranja. No contiene lactosa.",
    servingTemp: "3-6°C",
    flavorNotes: ["Durazno", "Maracuyá", "Naranja"]
  },
  {
    id: 3,
    name: "Tas Loco",
    subtitle: "New England IPA | 473ml",
    category: "ipa",
    style: "neipa",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "6.3%",
    titleColor: "#e63946",
    accentColor: "#c9a84c",
    bgColor: "#2e2c2d",
    heroNameHTML: "Tas <span style='color: #2563eb'>Loco</span>",
    image: "img/latas/tas-loco.webp",
    illustration: "img/ilustraciones/tas-loco.png",
    slug: "tas-loco",
    description: "Emblemática NEIPA con gran cantidad de lúpulo Sabro. Notas a frutos tropicales, coco fresco y tangerina. Cuerpo sedoso.",
    servingTemp: "4-7°C",
    flavorNotes: ["Tropical", "Coco", "Tangerina"]
  },
  {
    id: 4,
    name: "Renegada",
    subtitle: "American Pale Ale | 473ml",
    category: "apa",
    style: "apa",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "5.3%",
    titleColor: "#2bb5a0",
    heroTitleColor: "#ffcc00",
    accentColor: "#b85c3a",
    bgColor: "#19b3a6",
    image: "img/latas/renegada.webp",
    illustration: "img/ilustraciones/renegada.png",
    slug: "renegada",
    description: "Balanceada, amargor medio, perfil cítrico y resinoso (Cascade, Simcoe, Centennial y Amarillo).",
    servingTemp: "4-7°C",
    flavorNotes: ["Cítrico", "Resinoso", "Balanceada"]
  },
  {
    id: 5,
    name: "Alboroto",
    subtitle: "West Coast IPA | 473ml",
    category: "ipa",
    style: "ipa",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "6.5%",
    titleColor: "#2563eb",
    accentColor: "#d4a843",
    bgColor: "#f0efeb",
    image: "img/latas/alboroto.png",
    illustration: "img/ilustraciones/Alboroto.png",
    slug: "alboroto",
    description: "Perfil cítrico y tropical con amargor pronunciado y final seco.",
    servingTemp: "4-7°C",
    flavorNotes: ["Cítrico", "Tropical", "Amarga"]
  },
  {
    id: 6,
    name: "Guidaí",
    subtitle: "Amber Lager | 473ml",
    category: "lager",
    style: "lager",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "5.0%",
    titleColor: "#c0392b",
    accentColor: "#8b4513",
    bgColor: "#f9f8ed",
    image: "img/latas/guidai.webp",
    illustration: "",
    slug: "guidai",
    description: "Color rojo profundo, notas a caramelo y galletas tostadas. Guidaí = Luna en lengua Charrúa.",
    servingTemp: "4-7°C",
    flavorNotes: ["Caramelo", "Galleta", "Tostada"]
  },
  {
    id: 7,
    name: "Hué",
    subtitle: "Pilsner | 355ml",
    category: "lager",
    style: "lager",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "355ml",
    tags: [],
    price: 130,
    itauPrice: 111,
    abv: "4.2%",
    titleColor: "#1a6fa0",
    accentColor: "#2e7d9e",
    bgColor: "#e7e6e0",
    image: "img/latas/hue-355.webp",
    illustration: "",
    slug: "hue-355",
    description: "Lager baja en calorías, suave, limpia y refrescante.",
    servingTemp: "3-5°C",
    flavorNotes: ["Suave", "Limpia", "Refrescante"]
  },
  {
    id: 8,
    name: "Hué",
    subtitle: "Pilsner | 473ml",
    category: "lager",
    style: "lager",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "4.2%",
    titleColor: "#1a6fa0",
    accentColor: "#2e7d9e",
    bgColor: "#f9f8ee",
    image: "img/latas/hue-473.webp",
    illustration: "",
    slug: "hue-473",
    description: "Pilsner estilo Checo sin filtrar, madurada por 5 semanas. Notas a galleta, miel y pimienta. Hué = Agua.",
    servingTemp: "3-5°C",
    flavorNotes: ["Galleta", "Miel", "Pimienta"]
  },
  // ===== IN-STOCK: BOTTLES =====
  {
    id: 100,
    name: "Despelote V",
    subtitle: "Imperial Stout | 473ml",
    category: "stout",
    style: "stout",
    container: "can",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "473ml",
    tags: [],
    price: 190,
    itauPrice: 162,
    abv: "9.0%",
    titleColor: "#000000",
    accentColor: "#000000",
    bgColor: "#d13b3b",
    image: "img/latas/despelote-v.webp",
    illustration: "",
    illustration2: "img/vasos/despelote.png",
    slug: "despelote-v",
    description: "Un despelote... Cerveza negra con agregado de frambuesa. Mucho cuerpo, notas a café, chocolate y frambuesa ácida. *No contiene lactosa",
    servingTemp: "8-12°C",
    flavorNotes: ["Café", "Chocolate", "Frambuesa"]
  },
  {
    id: 9,
    name: "Que Los Indios... #4",
    subtitle: "Sour de cultivo mixto | Botella 750ml",
    category: "barrel-aged",
    style: "barrel-aged",
    container: "bottle",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "750ml",
    tags: [],
    price: 450,
    itauPrice: 383,
    abv: "6.5%",
    titleColor: "#c0392b",
    accentColor: "#8b6914",
    bgColor: "#1a1a1a",
    image: "img/latas/que-los-indios.webp",
    illustration: "img/ilustraciones/que-los-indios-de-su-pueblo-se-gobiernen-por-si-solos-1.png",
    slug: "que-los-indios-4",
    description: "Añejada 12 meses en barrica de roble, refermentada con mango. Notas fuertes a mango dulce y madera.",
    servingTemp: "8-12°C",
    flavorNotes: ["Mango", "Roble", "Madera"]
  },
  {
    id: 10,
    name: "Que Los Indios... #3",
    subtitle: "Sour de cultivo mixto | Botella 750ml",
    category: "barrel-aged",
    style: "barrel-aged",
    container: "bottle",packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}],
    size: "750ml",
    tags: [],
    price: 450,
    itauPrice: 383,
    abv: "6.5%",
    titleColor: "#d6336c",
    accentColor: "#a52a5a",
    bgColor: "#1a1a1a",
    image: "img/latas/que-los-indios.webp",
    illustration: "img/ilustraciones/que-los-indios-de-su-pueblo-se-gobiernen-por-si-solos-1.png",
    slug: "que-los-indios-3",
    description: "Añejada 12 meses en barrica de roble, refermentada con frambuesas. Notas a mermelada de frambuesa dulce.",
    servingTemp: "8-12°C",
    flavorNotes: ["Frambuesa", "Roble", "Mermelada"]
  },
  // ===== IN-STOCK: MERCH =====
  {
    id: 11,
    titleColor: "#1a3a6b",
    name: "Buzo logo azul",
    subtitle: "Buzo unisex 100% algodón",
    category: "merch",
    style: "merch",
    container: "merch",
    size: "Talle único",
    tags: ["merch"],
    price: 1000,
    itauPrice: 850,
    abv: "",
    accentColor: "#1a3a6b",
    bgColor: "#2b2f40",
    image: "img/latas/buzo-logo-azul.webp",
    illustration: "",
    slug: "buzo-logo-azul",
    description: "Buzo unisex, 100% algodón. Recomendado elegir un talle más grande para hombres.",
    servingTemp: "",
    flavorNotes: []
  },
  {
    id: 12,
    titleColor: "#1a3a6b",
    name: "Remera Logo Azul",
    subtitle: "Remera unisex 100% algodón",
    category: "merch",
    style: "merch",
    container: "merch",
    size: "Talle único",
    tags: ["merch"],
    price: 800,
    itauPrice: 680,
    abv: "",
    accentColor: "#1a3a6b",
    bgColor: "#0f1b37",
    image: "img/latas/remera-logo-azul.webp",
    illustration: "",
    slug: "remera-logo-azul",
    description: "Remera unisex, 100% algodón. Recomendado elegir un talle más grande para hombres.",
    servingTemp: "",
    flavorNotes: []
  },
  {
    id: 13,
    titleColor: "#333333",
    name: "Vaso logo 400ml",
    subtitle: "Vaso con serigrafía",
    category: "merch",
    style: "merch",
    container: "merch",
    size: "400ml",
    tags: ["merch"],
    price: 200,
    itauPrice: 170,
    abv: "",
    accentColor: "#333333",
    bgColor: "#f5f0e5",
    image: "img/latas/vaso-logo.webp",
    illustration: "",
    slug: "vaso-logo-400ml",
    description: "Vaso con serigrafía de logo en blanco.",
    servingTemp: "",
    flavorNotes: []
  },
  // ===== IN-STOCK: VALUE PACK =====
  {
    id: 14,
    titleColor: "#6c3bbf",
    name: "Armá tu Pack",
    subtitle: "3 cervezas + vaso 400ml",
    category: "valuepack",
    style: "valuepack",
    container: "pack",
    size: "3x473ml + vaso",
    tags: ["valuepack"],
    price: 790,
    itauPrice: 672,
    abv: "",
    accentColor: "#2d1b69",
    bgColor: "#1a1a1a",
    cardImage: "img/latas/arma-tu-pack.webp",
    image: "img/latas/pack-3-latas.webp",
    illustration: "",
    slug: "pack-3-latas-vaso",
    customPack: true,
    description: "¡Ideal para regalo! Armá la caja con tus 3 cervezas favoritas. Incluye 1 vaso Malafama 400ml.",
    servingTemp: "",
    flavorNotes: []
  },
  // ===== ARCHIVE (OUT OF STOCK) =====
  {
    id: 100, name: "Sin Rival", subtitle: "West Coast IPA | 473ml", category: "ipa", style: "ipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#c88a3a", bgColor: "#e8c88a", image: "img/latas/oz1znii4fr92jw46thnp.webp", illustration: "", slug: "sin-rival", description: "West Coast IPA seca y de amargor firme, con perfil aromático intenso a lima, pomelo y frutas tropicales. Riwaka y Mosaic.", servingTemp: "4-7°C", flavorNotes: ["Lima", "Pomelo", "Tropical"]
  },
  {
    id: 101, name: "Rompecabezas", subtitle: "Imperial NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 220, itauPrice: 187, abv: "10.0%", titleColor: "#000000", accentColor: "#d44a4a", bgColor: "#22b280", image: "img/latas/rompecabesas.png", illustration: "img/ilustraciones/rompecabezas.png", illustration2: "img/vasos/rompecabezas.png", slug: "rompecabezas", description: "Te vuela la cabeza… Lúpulos Sabro y Citra con notas tropicales y cítricas. Peligrosamente tomable.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Cítrico", "Sabro"]
  },
  {
    id: 102, name: "Bolonqui", subtitle: "Sour Frambuesa | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#c44a6a", bgColor: "#fbfbfc", image: "img/latas/q2pxg69oxbl4km9zot71.webp", illustration: "img/ilustraciones/bolonqui.png", illustration2: "img/vasos/bolonqui.png", slug: "bolonqui", description: "Frambuesas recién cosechadas a menos de 30km de nuestra fábrica (200g por litro). No contiene lactosa.", servingTemp: "3-6°C", flavorNotes: ["Frambuesa", "Ácida", "Frutal"]
  },
  {
    id: 103, name: "Yapeyú", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#4a8c5a", bgColor: "#f0c150", image: "img/latas/gieaileabl52h1p7yjry.webp", illustration: "img/ilustraciones/yapeyu.png", illustration2: "img/vasos/yapeyu.png", slug: "yapeyu", description: "NEIPA con lúpulo Riwaka (NZ) y Citra (EEUU). Notas cítricas y tropicales. Muy aromática, jugosa y tropical.", servingTemp: "4-7°C", flavorNotes: ["Cítrico", "Tropical", "Jugosa"]
  },
  {
    id: 104, name: "Rompecocos", subtitle: "Imperial Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "9.0%", accentColor: "#3a2a1a", bgColor: "#777777", image: "img/latas/ktzkz9iehsgwbhvfqoza.webp", illustration: "img/ilustraciones/rompecocos.png", slug: "rompecocos", description: "Imperial pastry stout madurada sobre coco chips tostados. Chocolatosa y dulce con aromas a coco, caramelo y café. CONTIENE LACTOSA.", servingTemp: "8-12°C", flavorNotes: ["Chocolate", "Coco", "Café"]
  },
  {
    id: 105, name: "Matunga", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#c8a040", bgColor: "#1a806f", image: "img/latas/xqnxcep36z174pubz9sf.webp", illustration: "img/ilustraciones/matunga.png", slug: "matunga", description: "NEIPA con los favoritos Citra y Amarillo. Cerveza jugosa y sedosa con notas predominantes a cítricos y frutas tropicales.", servingTemp: "4-7°C", flavorNotes: ["Cítrico", "Tropical", "Sedosa"]
  },
  {
    id: 106, name: "Barullo", subtitle: "Oatmeal Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.0%", accentColor: "#2a1a0a", bgColor: "#fbfbfb", image: "img/latas/2zc2qc82qcls83p35aqh.webp", illustration: "img/ilustraciones/barullo.png", slug: "barullo", description: "Cerveza negra muy tomable. Sabor y aroma a maltas tostadas, café y chocolate. Suave y sedosa por el uso de avena. Ideal para invierno.", servingTemp: "8-12°C", flavorNotes: ["Café", "Chocolate", "Avena"]
  },
  {
    id: 107, name: "El Puesto", subtitle: "Pilsner | 473ml", category: "lager", style: "lager", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.2%", accentColor: "#6a8a3a", bgColor: "#b4d48a", image: "img/latas/3uue56uo6lbl3zvsy7pc.webp", illustration: "", slug: "el-puesto", description: "Lager elaborada con cebada 100% uruguaya y lúpulo Cascade. Ligera y levemente amarga.", servingTemp: "3-5°C", flavorNotes: ["Ligera", "Cascade", "Uruguaya"]
  },
  {
    id: 108, name: "Patatús", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.8%", accentColor: "#d48a3a", bgColor: "#8a8a8a", image: "img/latas/uwwdlzdox9lanixcdq4y.webp", illustration: "", slug: "patatus", description: "NEIPA con lúpulos Ekuanot y Mosaic sobre base de avena y trigo. Super jugosa y cítrica.", servingTemp: "4-7°C", flavorNotes: ["Jugosa", "Cítrica", "Avena"]
  },
  {
    id: 109, name: "Guambia", subtitle: "Imperial Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "9.0%", accentColor: "#1a0a0a", bgColor: "#6a5a4a", image: "img/latas/xcst7ph4xvww15ow3itx.webp", illustration: "", slug: "guambia", description: "Imperial stout con mucho cuerpo. Predomina el chocolate y café con rico dulzor que balancea el alcohol. No contiene lactosa.", servingTemp: "8-12°C", flavorNotes: ["Chocolate", "Café", "Dulce"]
  },
  {
    id: 110, name: "Chasquibum", subtitle: "New England Pale Ale | 473ml", category: "apa", style: "apa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "5.5%", accentColor: "#5a8a4a", bgColor: "#5c2d6e", image: "img/latas/fgxoe37r21k1u56hwxa3.webp", illustration: "", slug: "chasquibum", description: "Lúpulos Mosaic e Idaho 7. Notas fuertes a frutos tropicales.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Mosaic", "Idaho 7"]
  },
  {
    id: 111, name: "Opa!", subtitle: "Doble West Coast IPA | 473ml", category: "ipa", style: "ipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "8.0%", accentColor: "#c84a2a", bgColor: "#e8a48a", image: "img/latas/9ngpf7g5ac4jwcrf2p7z.webp", illustration: "", slug: "opa", description: "Doble West Coast IPA con Cascade, Citra y Simcoe. Amargor limpio y pronunciado, notas florales, pomelo y limón.", servingTemp: "4-7°C", flavorNotes: ["Pomelo", "Limón", "Floral"]
  },
  {
    id: 112, name: "Sabandija", subtitle: "Sour Tropical | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#d48a2a", bgColor: "#f5f5f5", image: "img/latas/khhk9gklq2kqpyfhkm30.webp", illustration: "img/ilustraciones/sabandija.png", slug: "sabandija", description: "Sour con ananá, mango, maracuyá y cáscara de naranja. Muy tropical, cítrica y sutilmente ácida.", servingTemp: "3-6°C", flavorNotes: ["Ananá", "Mango", "Maracuyá"]
  },
  {
    id: 113, name: "Alucinación", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.5%", accentColor: "#6a4a8a", bgColor: "#2d4b9a", image: "img/latas/oepkda4t68tl7oqgzp4b.webp", illustration: "img/ilustraciones/alucinacion.png", slug: "alucinacion", description: "Una de las primeras recetas de 2018. Doble NEIPA con Mosaic, Citra y Simcoe. Jugosa, cítrica y muy tomable.", servingTemp: "4-7°C", flavorNotes: ["Jugosa", "Cítrica", "Mosaic"]
  },
  {
    id: 114, name: "Revolcón", subtitle: "West Coast Pils | 473ml", category: "lager", style: "lager", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#4a8a6a", bgColor: "#fccf14", image: "img/latas/ccvvfkrd1plq8hnwz4h1.webp", illustration: "img/ilustraciones/revolcon.png", slug: "revolcon", description: "Lager de bajo alcohol pero fuertemente lupulada con Mosaic, Citra y Simcoe.", servingTemp: "3-5°C", flavorNotes: ["Lupulada", "Cítrica", "Refrescante"]
  },
  {
    id: 115, name: "Despelote IV", subtitle: "Imperial Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "9.5%", accentColor: "#2a1a0a", bgColor: "#7a6a5a", image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp", illustration: "", slug: "despelote-iv", description: "Cerveza negra con nueces y canela. Mucho cuerpo, notas a chocolate, café y nueces. CONTIENE LACTOSA.", servingTemp: "8-12°C", flavorNotes: ["Nueces", "Canela", "Chocolate"]
  },
  {
    id: 116, name: "Sabandija II", subtitle: "Sour Cereza | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 220, itauPrice: 187, abv: "5.0%", accentColor: "#a42a4a", bgColor: "#5f5e55", image: "img/latas/xhcjvdqit0mxl5kamjbf.webp", illustration: "img/ilustraciones/sabandija.png", slug: "sabandija-ii", description: "Cerveza ácida con 300g/L de cerezas frescas. Nota a cerezas maduras, ciruelas y un leve sabor a almendras.", servingTemp: "3-6°C", flavorNotes: ["Cereza", "Ciruela", "Almendra"]
  },
  {
    id: 117, name: "Destartalada", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.0%", accentColor: "#8a6a3a", bgColor: "#d4c08a", image: "img/latas/6yeug12d2cy5dhbshij0.jpg", illustration: "", slug: "destartalada", description: "NEIPA de buen cuerpo y sedosa, con lúpulos Citra y HBC 472. Perfil a cítricos y coco fresco.", servingTemp: "4-7°C", flavorNotes: ["Cítrico", "Coco", "Sedosa"]
  },
  {
    id: 118, name: "Chúcara II", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.5%", accentColor: "#4a6a8a", bgColor: "#a0c4d4", image: "img/latas/x2ks6f45l03nemfkq6a6.webp", illustration: "", slug: "chucara-ii", description: "Doble NEIPA con El Dorado, 7C's y Simcoe. Predominan notas cítricas y a ananá.", servingTemp: "4-7°C", flavorNotes: ["Cítrico", "Ananá", "El Dorado"]
  },
  {
    id: 119, name: "Reproche II", subtitle: "American Pale Ale | 473ml", category: "apa", style: "apa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "5.3%", accentColor: "#6a8a4a", bgColor: "#b4d4a0", image: "img/latas/okpufnzxie1zjhz9smo6.webp", illustration: "", slug: "reproche-ii", description: "Mash hopped pale ale con Saaz. Dry hop con Sabro y Mosaic. Ligera y aromática. Notas a maracuyá.", servingTemp: "4-7°C", flavorNotes: ["Maracuyá", "Aromática", "Ligera"]
  },
  {
    id: 120, name: "Bolonqui", subtitle: "Sour Frutilla/Frambuesa | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.0%", accentColor: "#c42a4a", bgColor: "#e1ede7", image: "img/latas/lcjliol9exonmiivq701.webp", illustration: "img/ilustraciones/bolonqui.png", slug: "bolonqui-ii", description: "Frambuesas y frutillas de Melilla en enorme cantidad. Color rojo intenso y muy ácida. CONTIENE LACTOSA.", servingTemp: "3-6°C", flavorNotes: ["Frambuesa", "Frutilla", "Ácida"]
  },
  {
    id: 121, name: "Chambona", subtitle: "Sour Cereza | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#8a2a4a", bgColor: "#d48aa0", image: "img/latas/hf4kpirsqt4wbt9ms79d.webp", illustration: "", slug: "chambona", description: "Cerveza ácida con cerezas, aprox 250g por litro. Frutal, ácida y refrescante.", servingTemp: "3-6°C", flavorNotes: ["Cereza", "Frutal", "Refrescante"]
  },
  {
    id: 122, name: "Sucundún", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#c8a850", bgColor: "#e8d8a8", image: "img/latas/r16cml89oo2hd7bcs9z8.webp", illustration: "", slug: "sucundun", description: "Tropical, cremosa y notas a papaya. Lúpulos Sorachi Ace, HBC 472 y HBC 630.", servingTemp: "4-7°C", flavorNotes: ["Papaya", "Tropical", "Cremosa"]
  },
  {
    id: 123, name: "La Patria o la Tumba", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.5%", accentColor: "#3a5a8a", bgColor: "#8ab4d4", image: "img/latas/k5s2lcg2ji4mht20zb5k.webp", illustration: "", slug: "la-patria-o-la-tumba", description: "Doble NEIPA con Mosaic y HBC 630. Notas a ananá y durazno. Etiqueta por Paz Verdias.", servingTemp: "4-7°C", flavorNotes: ["Ananá", "Durazno", "Mosaic"]
  },
  {
    id: 124, name: "Chambona", subtitle: "Sour Mango | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "5.0%", accentColor: "#d4a040", bgColor: "#e8d4a0", image: "img/latas/e3o9kqwvkjzvuntxkb7b.webp", illustration: "", slug: "chambona-mango", description: "Sour con mango y sal rosa. Ácida, tropical y refrescante.", servingTemp: "3-6°C", flavorNotes: ["Mango", "Sal Rosa", "Tropical"]
  },
  {
    id: 125, name: "Que lo parió", subtitle: "Sour Jalapeño | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "5.0%", accentColor: "#4a8a3a", bgColor: "#a0d498", image: "img/latas/chu5gfide89727s3tvzf.webp", illustration: "", slug: "que-lo-pario", description: "Sour con jalapeños y lima junto a Bravío.", servingTemp: "3-6°C", flavorNotes: ["Jalapeño", "Lima", "Picante"]
  },
  {
    id: 126, name: "Mal Augurio", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#5a3a7a", bgColor: "#a88ac8", image: "img/latas/ku2m8uhnpwepio9k7i29.webp", illustration: "", slug: "mal-augurio", description: "NEIPA con lúpulo experimental HBC 630. Notas a frutas con carozo, cerezas y frambuesas.", servingTemp: "4-7°C", flavorNotes: ["Cereza", "Frambuesa", "Frutal"]
  },
  {
    id: 127, name: "Retobada", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#c86a3a", bgColor: "#e8b48a", image: "img/latas/2jdh8bwjp1skubl19u3g.webp", illustration: "", slug: "retobada", description: "Colaboración con @nasepop. NEIPA con El Dorado y Mosaic. Notas a ananá y mango.", servingTemp: "4-7°C", flavorNotes: ["Ananá", "Mango", "El Dorado"]
  },
  {
    id: 128, name: "Maturrango VI", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#8a7a3a", bgColor: "#d4c88a", image: "img/latas/9zu7u2zqelmq31e83gpk.webp", illustration: "", slug: "maturrango-vi", description: "NEIPA con Mosaic y Sorachi Ace. Super tropical y resinosa.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Resinosa", "Mosaic"]
  },
  {
    id: 129, name: "Doble Flor de Lio", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.5%", accentColor: "#d4604a", bgColor: "#e8a898", image: "img/latas/vnbxvgvfvoe4sjfs6sub.webp", illustration: "", slug: "doble-flor-de-lio", description: "NEIPA con 5 lúpulos: El Dorado, Ekuanot, Simcoe, Sabro e Idaho 7. Muy tomable, ligera y cítrica.", servingTemp: "4-7°C", flavorNotes: ["Cítrica", "Ligera", "5 Lúpulos"]
  },
  {
    id: 130, name: "Tas Re Loco", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "8.0%", accentColor: "#c8883a", bgColor: "#e8c48a", image: "img/latas/nbh5bibl0y3863mwxjjs.webp", illustration: "", slug: "tas-re-loco", description: "Versión doble de la clásica NEIPA. Jugo de frutas tropicales y cítricas por lúpulos Sabro e Idaho 7.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Cítrico", "Sabro"]
  },
  {
    id: 131, name: "Flor de Lio", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.0%", accentColor: "#d46a4a", bgColor: "#e8b4a0", image: "img/latas/qg8j5bt64domn95utrs0.webp", illustration: "", slug: "flor-de-lio", description: "NEIPA con 6 lúpulos: Citra, Mosaic, Columbus, El Dorado, Sabro e Idaho 7. Cítrica y tomable.", servingTemp: "4-7°C", flavorNotes: ["Cítrica", "6 Lúpulos", "Tomable"]
  },
  {
    id: 132, name: "Desmadre", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#c8a03a", bgColor: "#e8d48a", image: "img/latas/n743wzf3gu7p0xxoyjuz.webp", illustration: "", slug: "desmadre", description: "Línea Single-Hop con lúpulo Mosaic. Fuertes notas a mango y cítricos.", servingTemp: "4-7°C", flavorNotes: ["Mango", "Cítrico", "Mosaic"]
  },
  {
    id: 133, name: "Fatal", subtitle: "West Coast IPA | 473ml", category: "ipa", style: "ipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#8a3a2a", bgColor: "#d48a7a", image: "img/latas/jwc6mgc29x3pjl5mxqfa.webp", illustration: "", slug: "fatal", description: "West Coast IPA con dry hop de Citra. Pomelo, lima y frutas tropicales. Amargor alto y final seco.", servingTemp: "4-7°C", flavorNotes: ["Pomelo", "Lima", "Amarga"]
  },
  {
    id: 134, name: "La Dócil", subtitle: "Citra Lite Lager | 473ml", category: "lager", style: "lager", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#5a9a4a", bgColor: "#a8d498", image: "img/latas/xry3kugvl067v1ojofcn.webp", illustration: "", slug: "la-docil", description: "Light lager con dry hop de Citra. Ligera y refrescante con aroma de NEIPA.", servingTemp: "3-5°C", flavorNotes: ["Citra", "Ligera", "Refrescante"]
  },
  {
    id: 135, name: "Mandale Magia", subtitle: "Sour Arándano | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 220, itauPrice: 187, abv: "6.0%", accentColor: "#6a2a8a", bgColor: "#b48ad4", image: "img/latas/xkj450xj1le7v1boi20u.webp", illustration: "", slug: "mandale-magia", description: "Con Strange Brewing. Arándanos, coco tostado, coco fresco, vainilla y maple syrup. Dulce y sedosa. CONTIENE LACTOSA.", servingTemp: "3-6°C", flavorNotes: ["Arándano", "Coco", "Vainilla"]
  },
  {
    id: 136, name: "Chusma", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.8%", accentColor: "#c87a3a", bgColor: "#e8b88a", image: "img/latas/8xzpt50x9gc7n2ujg0lj.webp", illustration: "", slug: "chusma", description: "Combinación de Citra, Mosaic y Simcoe. Tropical y jugosa.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Jugosa", "Simcoe"]
  },
  {
    id: 137, name: "Doble Chasquibum", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "7.5%", accentColor: "#4a7a5a", bgColor: "#5c2d6e", image: "img/latas/b8oin1cbyb47moe3f987.webp", illustration: "", slug: "doble-chasquibum", description: "Con Mosaic y Sabro. Notas a mango, tangerina y coco fresco. Jugosa y sedosa.", servingTemp: "4-7°C", flavorNotes: ["Mango", "Tangerina", "Coco"]
  },
  {
    id: 138, name: "Traviesa", subtitle: "American Doble IPA | 473ml", category: "ipa", style: "ipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "8.0%", accentColor: "#b84a2a", bgColor: "#d8a48a", image: "img/latas/b7c87gr32j21x3qeqysb.webp", illustration: "", slug: "traviesa", description: "American Doble IPA con amargor pronunciado, limpio y balanceado.", servingTemp: "4-7°C", flavorNotes: ["Amarga", "Balanceada", "Limpia"]
  },
  {
    id: 139, name: "Sin Vueltas", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.5%", accentColor: "#6a8a5a", bgColor: "#b4d4a8", image: "img/latas/tlu4bk6vr0nh78b0zi6t.webp", illustration: "", slug: "sin-vueltas", description: "Con Mosaic, Cashmere y Citra. Notas a ananá, lima y mango.", servingTemp: "4-7°C", flavorNotes: ["Ananá", "Lima", "Mango"]
  },
  {
    id: 140, name: "Atrevida", subtitle: "Sour Zanahoria y Canela | 473ml", category: "sour", style: "sour", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "4.5%", accentColor: "#d48a3a", bgColor: "#e8c48a", image: "img/latas/ifrmspjyow950isb9y7l.webp", illustration: "", slug: "atrevida", description: "Inspirada en carrot cakes. Con zanahoria, canela y toque de lactosa.", servingTemp: "3-6°C", flavorNotes: ["Zanahoria", "Canela", "Dulce"]
  },
  {
    id: 141, name: "Cruda Realidad", subtitle: "Imperial NEIPA | 355ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "355ml", tags: ["archive"], price: 200, itauPrice: 170, abv: "9.0%", accentColor: "#3a6a8a", bgColor: "#8ab4d4", image: "img/latas/ixq0mscivfrihm3z0typ.webp", illustration: "", slug: "cruda-realidad", description: "No-Boil Imperial NEIPA con Strange Brewing. Sabro, Nelson Sauvin y Mosaic. Ananá, coco fresco y cítricos.", servingTemp: "4-7°C", flavorNotes: ["Ananá", "Coco", "Nelson Sauvin"]
  },
  {
    id: 142, name: "Despelote II", subtitle: "Imperial Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "9.0%", accentColor: "#1a0a0a", bgColor: "#6a5a4a", image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp", illustration: "", slug: "despelote-ii", description: "Imperial Stout con mucho cuerpo. Chocolate, café y dulzor.", servingTemp: "8-12°C", flavorNotes: ["Chocolate", "Café", "Dulce"]
  },
  {
    id: 143, name: "Despelote", subtitle: "Imperial Stout | 473ml", category: "stout", style: "stout", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "9.0%", accentColor: "#2a1a0a", bgColor: "#7a6a5a", image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp", illustration: "", slug: "despelote", description: "Imperial Stout potente y con carácter. Notas a chocolate negro y café tostado.", servingTemp: "8-12°C", flavorNotes: ["Chocolate", "Café", "Tostado"]
  },
  {
    id: 144, name: "Chúcara", subtitle: "Doble NEIPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "8.0%", accentColor: "#4a6a8a", bgColor: "#a0c4d4", image: "img/latas/x2ks6f45l03nemfkq6a6.webp", illustration: "", slug: "chucara", description: "Doble NEIPA intensa y lupulada. Jugosa con notas tropicales.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Jugosa", "Intensa"]
  },
  {
    id: 145, name: "Pituca", subtitle: "American IPA | 473ml", category: "ipa", style: "ipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.8%", accentColor: "#b87a3a", bgColor: "#d8b88a", image: "img/latas/uwwdlzdox9lanixcdq4y.webp", illustration: "", slug: "pituca", description: "American IPA con carácter. Perfil a cítricos y resina.", servingTemp: "4-7°C", flavorNotes: ["Cítrico", "Resina", "Amarga"]
  },
  {
    id: 146, name: "Chasquibum IV", subtitle: "New England IPA | 473ml", category: "ipa", style: "neipa", container: "can", packOptions: [{label: "UNIDAD", multiplier: 1}, {label: "6-PACK", multiplier: 6}, {label: "12-PACK", multiplier: 12}, {label: "24-PACK", multiplier: 24}], size: "473ml", tags: ["archive"], price: 190, itauPrice: 162, abv: "6.0%", accentColor: "#5a8a4a", bgColor: "#5c2d6e", image: "img/latas/fgxoe37r21k1u56hwxa3.webp", illustration: "", slug: "chasquibum-iv", description: "NEIPA con notas tropicales frescas y cuerpo sedoso.", servingTemp: "4-7°C", flavorNotes: ["Tropical", "Sedosa", "Fresca"]
  },

  // ===== BARREL-AGED: BOTELLAS 750ML =====
  {
    id: 200,
    name: "Despelote V",
    subtitle: "Imperial Stout Barrel Aged | 750ml",
    category: "stout",
    style: "barrel-aged",
    container: "bottle",
    packOptions: [{label: "UNIDAD", multiplier: 1}],
    size: "750ml",
    tags: ["special", "limited"],
    price: 450,
    itauPrice: 383,
    abv: "9.0%",
    titleColor: "#1a0a0a",
    accentColor: "#8b6914",
    bgColor: "#2a1a0a",
    image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp",
    illustration: "",
    slug: "despelote-v-barrel",
    description: "Imperial Stout añejada en barrica de roble. Notas profundas a chocolate negro, café, vainilla y madera. Edición limitada.",
    servingTemp: "10-14°C",
    flavorNotes: ["Chocolate", "Vainilla", "Roble"]
  },
  {
    id: 201,
    name: "Que los indios se gobiernen por sí",
    subtitle: "Sour de Cultivo Mixto | 750ml",
    category: "sour",
    style: "barrel-aged",
    container: "bottle",
    packOptions: [{label: "UNIDAD", multiplier: 1}],
    size: "750ml",
    tags: ["special", "limited", "archive"],
    price: 490,
    itauPrice: 417,
    abv: "6.5%",
    titleColor: "#8b0000",
    accentColor: "#c9a84c",
    bgColor: "#f5e6d0",
    image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp",
    illustration: "img/ilustraciones/que-los-indios-de-su-pueblo-se-gobiernen-por-si-solos-1.png",
    slug: "que-los-indios-barrel",
    description: "Sour de cultivo mixto añejada en barrica. Fermentación salvaje con carácter complejo, acidez elegante y notas de fruta de carozo.",
    servingTemp: "8-12°C",
    flavorNotes: ["Ácida", "Frutal", "Compleja"]
  },
  {
    id: 202,
    name: "La Patria o la Tumba",
    subtitle: "Imperial Stout Barrel Aged | 750ml",
    category: "stout",
    style: "barrel-aged",
    container: "bottle",
    packOptions: [{label: "UNIDAD", multiplier: 1}],
    size: "750ml",
    tags: ["special", "limited", "archive"],
    price: 450,
    itauPrice: 383,
    abv: "10.0%",
    titleColor: "#2a1a0a",
    accentColor: "#c9a84c",
    bgColor: "#1a1a1a",
    image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp",
    illustration: "",
    slug: "la-patria-o-la-tumba",
    description: "Imperial Stout potente añejada en barrica de whisky. Sabores intensos a chocolate, tabaco, cuero y roble ahumado.",
    servingTemp: "10-14°C",
    flavorNotes: ["Tabaco", "Whisky", "Ahumado"]
  },
  {
    id: 203,
    name: "Sour de Uva",
    subtitle: "Sour Barrel Aged con Uva | 750ml",
    category: "sour",
    style: "barrel-aged",
    container: "bottle",
    packOptions: [{label: "UNIDAD", multiplier: 1}],
    size: "750ml",
    tags: ["special", "limited", "archive"],
    price: 490,
    itauPrice: 417,
    abv: "7.0%",
    titleColor: "#6a0dad",
    accentColor: "#c9a84c",
    bgColor: "#f0e0f0",
    image: "img/latas/cv1l3f9fxez5n8lf5bd7.webp",
    illustration: "",
    slug: "sour-de-uva-barrel",
    description: "Sour añejada en barrica de vino con uvas Tannat uruguayas. Acidez vivaz, taninos suaves y notas a frutos rojos.",
    servingTemp: "8-12°C",
    flavorNotes: ["Uva", "Tannat", "Ácida"]
  },
  {
    id: 204,
    name: "Guidaí Barrica",
    subtitle: "Amber Lager Barrel Aged | 750ml",
    category: "lager",
    style: "barrel-aged",
    container: "bottle",
    packOptions: [{label: "UNIDAD", multiplier: 1}],
    size: "750ml",
    tags: ["special", "limited", "archive"],
    price: 390,
    itauPrice: 332,
    abv: "5.5%",
    titleColor: "#c0392b",
    accentColor: "#8b4513",
    bgColor: "#f5e6d0",
    image: "img/latas/hvdplk0dftj99w4qee5x.webp",
    illustration: "",
    slug: "guidai-barrica",
    description: "Nuestra Guidaí Amber Lager añejada en barrica de roble. Suave, maltosa con notas a vainilla y caramelo de la madera.",
    servingTemp: "6-10°C",
    flavorNotes: ["Vainilla", "Caramelo", "Roble"]
  }
];

// Data definitions
const CONTAINER_TYPES = [
  { id: "all", label: "Todas" },
  { id: "can", label: "Latas" },
  { id: "bottle", label: "Botellas" }
];

const BEER_STYLES = [
  { id: "all", label: "Todas" },
  { id: "ipa", label: "IPA" },
  { id: "neipa", label: "NEIPA" },
  { id: "apa", label: "APA" },
  { id: "sour", label: "Sour" },
  { id: "stout", label: "Stout" },
  { id: "lager", label: "Lager" },
  { id: "barrel-aged", label: "Barrica" }
];

// Sort options
const SORT_OPTIONS = [
  { id: "default", label: "Destacados" },
  { id: "price-asc", label: "Precio: Menor a Mayor" },
  { id: "price-desc", label: "Precio: Mayor a Menor" },
  { id: "name-asc", label: "Nombre: A-Z" },
  { id: "name-desc", label: "Nombre: Z-A" }
];

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTS, CONTAINER_TYPES, BEER_STYLES, SORT_OPTIONS };
}
