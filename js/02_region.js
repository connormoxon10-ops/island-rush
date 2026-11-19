/* ================= REGIONS: every town sits in its own biome, with its own look, weather and rules =================
   REG[i] belongs to towns[i]. Around each town a soft field (Biome.at) blends that biome's palette, plants, terrain shape and
   atmosphere into the default temperate island, so the biomes bleed into one another instead of switching at hard borders. */
const REG = [
  { key: 'harbor', name: 'Port Marlow', tag: 'Industrial harbour town', traits: ['Drizzle and wet roads', 'Heavy traffic', 'Container yards'], col: 0xf2b632,
    pal: { grassA: 0x56684a, grassB: 0x6c7b53, dry: 0x80775a, forest: 0x2e4333, mead: 0x61744b, sand: 0xb3a98b, dirt: 0x6c604b, rock: 0x6a6c70, rockD: 0x44464a, gravel: 0x6a6a68 },
    pave: 0x727476, paveAmt: 0.96, snowLine: 112,
    tree: { dens: 0.55, mix: [['pine', 0.35], ['oak', 0.35], ['birch', 0.1], ['scrub', 0.2]], rocks: [0, 2, 3, 4], bush: 0.2 },
    sky: { grey: 0.62, mist: 0.25, warm: 0, dust: 0 }, wx: { rain: 0.5 },
    arch: { bc: [0x8a5a48, 0x77493b, 0x9a5c46, 0x6f7378, 0x8c6a58, 0xa8a196, 0x7a4a3c], mc: [0x9a6a54, 0x7b5646, 0x8a4f3c, 0x6a7077, 0xb08a6a], hc: [0xa6755c, 0x8c6a58, 0x9a5a48, 0xc4b89c, 0x7d8a92], rc: [0x3d4650, 0x2d333b, 0x5a3a30],
      roof: 'low', hr: 2.0, dtH: [26, 64], midH: [14, 30], extra: 'stacks' },
    mod: { grip: 0.93, gripOff: 0.97, traffic: 1.25, peds: 1.0, heat: 1.0, fine: 1.0 }, look: 'worker' },
  { key: 'desert', name: 'Redstone', tag: 'Desert mining town', traits: ['Sand and dust haze', 'Quiet, lenient police', 'Mesas and cacti'], col: 0xe07a3a,
    pal: { grassA: 0xc79a5c, grassB: 0xd1a868, dry: 0xbf8450, forest: 0xa97a48, mead: 0xcfa364, sand: 0xe6c88e, dirt: 0xb4663a, rock: 0xa8603c, rockD: 0x74412c, gravel: 0xbc9a6c },
    pave: 0xc9a974, paveAmt: 0.97, snowLine: 170,
    tree: { dens: 0.3, mix: [['cactus', 0.4], ['scrub', 0.6]], rocks: [8, 9, 10, 1], bush: 0.1, rockK: 1.8, tl: 90 },
    sky: { grey: 0.05, mist: 0, warm: 0.5, dust: 0.45 }, wx: { dust: 0.55 },
    arch: { bc: [0xe0c08c, 0xd1a574, 0xc89a68, 0xe8cfa2, 0xb98558], mc: [0xd9b27c, 0xcf9f6c, 0xe3c69a, 0xc28a5c], hc: [0xe6caa0, 0xd8b07e, 0xcfa070, 0xeed9b4], rc: [0xc07a4a, 0xa8643a, 0xd8b98a],
      roof: 'flat', hr: 0, dtH: [14, 32], midH: [8, 16], extra: 'tank' },
    mod: { grip: 0.98, gripOff: 0.78, traffic: 0.6, peds: 0.6, heat: 0.75, fine: 0.8 }, look: 'desert' },
  { key: 'farm', name: 'Eastvale', tag: 'Farmland and autumn woods', traits: ['Patchwork fields', 'Quiet roads, relaxed police', 'Morning mist'], col: 0xd9a03a,
    pal: { grassA: 0x5f8a30, grassB: 0x86a23c, dry: 0xb59f48, forest: 0x4f7a2c, mead: 0x7fa13a, sand: 0xcdb98a, dirt: 0x7d5f3b, rock: 0x827a6c, rockD: 0x56514a, gravel: 0x8e8372 },
    pave: 0x9a9a88, paveAmt: 0.5, snowLine: 112,
    tree: { dens: 0.5, mix: [['autumn', 0.35], ['oak', 0.35], ['birch', 0.3]], rocks: [0, 1, 4, 7], bush: 0.3 },
    sky: { grey: 0.15, mist: 0.55, warm: 0.4, dust: 0 }, wx: {},
    arch: { bc: [0xe8e0d0, 0xd9cfb8, 0xc9bba0, 0xe3d6b8], mc: [0xe8dcc0, 0xd4c4a4, 0xf0e8d6], hc: [0xf2eee2, 0xe6dcc4, 0xd9a68a, 0xc9d2bb], rc: [0x8a3a2b, 0x6f4a3a, 0x4a3f3a, 0x9a4a35],
      roof: 'pitch', hr: 3.2, dtH: [10, 22], midH: [8, 14], extra: 'barn' },
    mod: { grip: 1.0, gripOff: 0.96, traffic: 0.5, peds: 0.6, heat: 0.7, fine: 0.7 }, look: 'farm' },
  { key: 'tropic', name: 'Cape Harlow', tag: 'Tropical beach resort', traits: ['Lagoons, beaches and palms', 'Crowded promenades', 'Sand off the roads'], col: 0x2fc4c0,
    pal: { grassA: 0x58a03a, grassB: 0x7bb546, dry: 0xc2b26a, forest: 0x2f7a3a, mead: 0x6aaa3c, sand: 0xf0e0b0, dirt: 0xc9a870, rock: 0x8b8478, rockD: 0x5e5a52, gravel: 0xd6c8a0 },
    pave: 0xece3cc, paveAmt: 0.9, snowLine: 170,
    tree: { dens: 1.15, mix: [['palm', 0.72], ['oak', 0.13], ['scrub', 0.15]], rocks: [0, 1, 5], bush: 0.4 },
    sky: { grey: 0, mist: 0.08, warm: 0.15, dust: 0 }, wx: {},
    arch: { bc: [0xf6f2e8, 0xf7d8c4, 0xbfe6e2, 0xf2c9d6, 0xf7ecb0, 0xffffff], mc: [0xf9efe0, 0xf5d0bc, 0xcdeeea, 0xf5e2a8], hc: [0xfaf2e6, 0xf6d2c0, 0xc9ece6, 0xf8e3a6, 0xf3b8a8], rc: [0xd8673a, 0xc9552e, 0x3aa6b8, 0xf0ede4],
      roof: 'low', hr: 2.2, dtH: [28, 72], midH: [14, 30], extra: 'palms' },
    mod: { grip: 1.0, gripOff: 0.88, traffic: 1.0, peds: 1.55, heat: 1.0, fine: 1.0 }, look: 'beach' },
  { key: 'alpine', name: 'Summit Ridge', tag: 'Alpine ski town', traits: ['Snow and ice on the roads', 'Mountain passes', 'Light traffic'], col: 0x8ec8ff,
    pal: { grassA: 0x5f7d4c, grassB: 0x7a8f5a, dry: 0x8c8a6a, forest: 0x2c4a3a, mead: 0x6b8c58, sand: 0xc2bfb0, dirt: 0x6e5f4e, rock: 0x777b82, rockD: 0x4a4e55, snow: 0xf2f6fa, gravel: 0xaab0b8 },
    pave: 0xe8edf2, paveAmt: 0.93, snowLine: -10,
    tree: { dens: 1.05, mix: [['snowpine', 0.78], ['pine', 0.22]], rocks: [11, 3, 0], bush: 0.1, rockK: 1.3, tl: 165 },
    sky: { grey: 0.35, mist: 0.2, warm: 0, dust: 0, cold: 0.5 }, wx: { snow: 0.85 },
    arch: { bc: [0x8a6a4a, 0x9a7a56, 0x6e5236, 0xb48e62], mc: [0x9a7550, 0x8b6a47, 0xa9835a], hc: [0x93704a, 0xa5805a, 0x7a5a3c, 0xb89468, 0xd8c9ae], rc: [0xf1f4f7, 0xdfe6ee, 0xc9d3dc, 0x5a4a3a],
      roof: 'steep', hr: 5.2, dtH: [12, 26], midH: [8, 16], extra: 'snow' },
    mod: { grip: 0.8, gripOff: 0.82, traffic: 0.5, peds: 0.55, heat: 1.0, fine: 1.0 }, look: 'alpine' },
  { key: 'lake', name: 'Lakeshore', tag: 'Lakes and deep forest', traits: ['Lakes and dense woods', 'Fog off the water', 'Muddy shoulders'], col: 0x4fa86a,
    pal: { grassA: 0x3f6a34, grassB: 0x56803d, dry: 0x77794a, forest: 0x1f3d2a, mead: 0x4d7a3a, sand: 0xcbbd90, dirt: 0x5a4a38, rock: 0x6b6d66, rockD: 0x44463f, gravel: 0x84806f },
    pave: 0x7d8570, paveAmt: 0.6, snowLine: 112,
    tree: { dens: 1.7, mix: [['pine', 0.35], ['birch', 0.3], ['oak', 0.25], ['autumn', 0.1]], rocks: [4, 7, 0, 2], bush: 0.45 },
    sky: { grey: 0.3, mist: 0.9, warm: 0, dust: 0 }, wx: {},
    arch: { bc: [0x7a5a3c, 0x6a4a30, 0x8a6a48, 0x5d4a3f], mc: [0x84603f, 0x6f5238, 0x946f4a], hc: [0x7a5a3c, 0x8a6a48, 0x5d4a3f, 0x9a7a52, 0xb09870], rc: [0x2f4a3a, 0x3a3f3a, 0x5a3a2a, 0x24382c],
      roof: 'pitch', hr: 3.6, dtH: [14, 30], midH: [8, 16], extra: 'lodge' },
    mod: { grip: 0.97, gripOff: 0.9, traffic: 0.7, peds: 0.7, heat: 0.9, fine: 0.9 }, look: 'lake' },
  { key: 'city', name: 'Fairhaven', tag: 'Glass-tower financial district', traits: ['Skyscrapers and neon', 'Dense traffic, heavy policing', 'Big fines'], col: 0x7aa8ff,
    pal: { grassA: 0x4a7a3a, grassB: 0x62923f, dry: 0x9a9a5a, forest: 0x2c5a30, mead: 0x58903c, sand: 0xdccaa0, dirt: 0x7a6a50, rock: 0x7d8086, rockD: 0x50535a, gravel: 0x9a9a9a },
    pave: 0xb4babf, paveAmt: 0.98, snowLine: 112,
    tree: { dens: 0.45, mix: [['oak', 0.4], ['cypress', 0.4], ['palm', 0.2]], rocks: [0, 2], bush: 0.3 },
    sky: { grey: 0.1, mist: 0.1, warm: 0, dust: 0, smog: 0.35 }, wx: {},
    arch: { bc: [0x9fb6cc, 0x7fa5c2, 0xb9c9d6, 0x6f8ca8, 0x4f6e86, 0xe1e9ef, 0x3f5a70], mc: [0xa9bdd0, 0x8fa9c0, 0xc4d0da, 0x7f98ac], hc: [0xe9eaec, 0xd5d9de, 0xb8c2cc, 0xf4f1ea], rc: [0x6a727a, 0x8a929a, 0x4a5058],
      roof: 'flat', hr: 0, dtH: [70, 190], midH: [28, 56], extra: 'glass' },
    mod: { grip: 1.0, gripOff: 0.95, traffic: 1.5, peds: 1.3, heat: 1.4, fine: 1.4 }, look: 'suit' },
  /* ---- the outer ring (added with the bigger island) ---- */
  { key: 'swamp', name: 'Bayou Hollow', tag: 'Cypress swamp and bayous', traits: ['Murky bayous and hanging moss', 'Fog and warm rain', 'Soft, muddy ground'], col: 0x8ab04a,
    pal: { grassA: 0x4a5f2c, grassB: 0x5d7034, dry: 0x6f6a3e, forest: 0x2a3c22, mead: 0x56682e, sand: 0x8a7a54, dirt: 0x4e4230, rock: 0x5e5f52, rockD: 0x3c3d34, gravel: 0x6a6450 },
    pave: 0x6a6a5e, paveAmt: 0.55, snowLine: 170,
    tree: { dens: 1.5, mix: [['cypress', 0.45], ['oak', 0.35], ['autumn', 0.2]], rocks: [4, 7, 0], bush: 0.55 },
    sky: { grey: 0.35, mist: 0.85, warm: 0.15, dust: 0 }, wx: { rain: 0.3 },
    arch: { bc: [0x7a6a52, 0x8a7a5e, 0x6a5a44, 0x9a8a6a], mc: [0x8a7a5e, 0x7a6a50, 0x9a8c70], hc: [0x8c7a5c, 0x7d9a8a, 0xa89a7a, 0x6a7a6a, 0xc4b89a], rc: [0x5a4a3a, 0x3a3f3a, 0x6a5040, 0x4a5a4a],
      roof: 'pitch', hr: 2.6, dtH: [10, 20], midH: [6, 12], extra: 'stilts' },
    mod: { grip: 0.95, gripOff: 0.74, traffic: 0.55, peds: 0.6, heat: 0.8, fine: 0.8 }, look: 'lake' },
  { key: 'volcano', name: 'Ashfall', tag: 'Volcanic black-sand coast', traits: ['A smoking volcano', 'Black sand and ash', 'Lava fields'], col: 0xff5a2a,
    pal: { grassA: 0x4e5a3a, grassB: 0x5f6a40, dry: 0x6a6052, forest: 0x2e3a2a, mead: 0x56603e, sand: 0x2e2c2c, dirt: 0x3a3330, rock: 0x2c2a2a, rockD: 0x1a1818, gravel: 0x4a4644 },
    pave: 0x3e3c3c, paveAmt: 0.97, snowLine: 230,
    tree: { dens: 0.35, mix: [['palm', 0.35], ['scrub', 0.65]], rocks: [8, 9, 1, 3], bush: 0.15, rockK: 1.6 },
    sky: { grey: 0.4, mist: 0.1, warm: 0.35, dust: 0.3 }, wx: { dust: 0.25 },
    arch: { bc: [0x3a3838, 0x4a4644, 0x5a5450, 0x2e2c2c, 0x6a625a], mc: [0x4a4644, 0x5a5450, 0x3e3a38], hc: [0x6a625a, 0x5a5450, 0x8a7a6a, 0xd8d0c4], rc: [0x2a2828, 0x3a3434, 0x8a3a2a],
      roof: 'flat', hr: 0, dtH: [14, 34], midH: [8, 16], extra: 'tank' },
    mod: { grip: 0.97, gripOff: 0.82, traffic: 0.7, peds: 0.6, heat: 1.0, fine: 1.0 }, look: 'worker' },
  { key: 'savanna', name: 'Sundown Plains', tag: 'Golden savanna', traits: ['Endless golden grass', 'Long straight roads', 'Hot, dusty evenings'], col: 0xe8b040,
    pal: { grassA: 0xb89a4a, grassB: 0xc8aa52, dry: 0xc89a54, forest: 0x7a7a3a, mead: 0xbca04e, sand: 0xd8bc84, dirt: 0xa66a3a, rock: 0x9a7a5a, rockD: 0x6a503a, gravel: 0xb49a70 },
    pave: 0xb09a74, paveAmt: 0.85, snowLine: 230,
    tree: { dens: 0.28, mix: [['oak', 0.35], ['scrub', 0.65]], rocks: [8, 1, 9], bush: 0.2, rockK: 1.3 },
    sky: { grey: 0.02, mist: 0, warm: 0.55, dust: 0.25 }, wx: { dust: 0.2 },
    arch: { bc: [0xd8a86a, 0xc8905a, 0xe0b880, 0xb87a4a], mc: [0xd0a06a, 0xe0bc88, 0xc08a58], hc: [0xe6c48c, 0xd8a870, 0xc89060, 0xf0dcb0], rc: [0x8a5a2a, 0xb07a3a, 0x6a4a2a],
      roof: 'low', hr: 1.6, dtH: [10, 22], midH: [6, 12], extra: 'tank' },
    mod: { grip: 1.0, gripOff: 0.9, traffic: 0.5, peds: 0.5, heat: 0.7, fine: 0.7 }, look: 'desert' },
  { key: 'vineyard', name: 'Vellano', tag: 'Hillside vineyards', traits: ['Rows of vines on the hills', 'Cypress-lined lanes', 'Warm evenings'], col: 0xb04a7a,
    pal: { grassA: 0x7a8a3e, grassB: 0x8e9a46, dry: 0xb0a058, forest: 0x4a5a2c, mead: 0x86943e, sand: 0xd8c49a, dirt: 0x9a5a3a, rock: 0xa8987a, rockD: 0x786a54, gravel: 0xc0aa88 },
    pave: 0xc8b8a0, paveAmt: 0.8, snowLine: 170,
    tree: { dens: 0.7, mix: [['cypress', 0.55], ['oak', 0.45]], rocks: [0, 1, 4], bush: 0.35 },
    sky: { grey: 0.05, mist: 0.15, warm: 0.45, dust: 0 }, wx: {},
    arch: { bc: [0xf0e0c0, 0xe8d0a8, 0xd8b88a, 0xf2e8d4], mc: [0xecd8b4, 0xe0c49a, 0xf4e8d0], hc: [0xf2e4c8, 0xe6cca4, 0xd8b088, 0xf8f0e0], rc: [0xc0603a, 0xb0502e, 0xd0704a],
      roof: 'low', hr: 2.2, dtH: [10, 22], midH: [8, 14], extra: 'palms' },
    mod: { grip: 1.0, gripOff: 0.92, traffic: 0.6, peds: 0.8, heat: 0.8, fine: 0.9 }, look: 'farm' },
  { key: 'tundra', name: 'Frostholm', tag: 'Arctic tundra and taiga', traits: ['Permafrost and drifting snow', 'Northern lights', 'Icy roads'], col: 0xa8e8ff,
    pal: { grassA: 0x8a9a88, grassB: 0x9aa898, dry: 0xa0a08a, forest: 0x2a3e34, mead: 0x92a090, sand: 0xc8ccc8, dirt: 0x6a6458, rock: 0x7a8088, rockD: 0x50565e, snow: 0xf4f8fc, gravel: 0xb0b6bc },
    pave: 0xe4eaf0, paveAmt: 0.95, snowLine: 0,
    tree: { dens: 0.7, mix: [['snowpine', 0.6], ['birch', 0.4]], rocks: [11, 3, 0], bush: 0.1, rockK: 1.2 },
    sky: { grey: 0.3, mist: 0.25, warm: 0, dust: 0, cold: 0.7 }, wx: { snow: 0.7 },
    arch: { bc: [0x9a3a2a, 0x2a4a6a, 0xd8b04a, 0x6a6a6a], mc: [0xa8402e, 0x3a5a7a, 0xe0c060], hc: [0xa8402e, 0x2e5a7a, 0xd8b450, 0x3a6a4a, 0xe8e0d0], rc: [0x2a2a2a, 0x3a3a3a, 0xf0f4f8],
      roof: 'steep', hr: 4.2, dtH: [12, 24], midH: [8, 14], extra: 'snow' },
    mod: { grip: 0.76, gripOff: 0.8, traffic: 0.45, peds: 0.5, heat: 1.0, fine: 1.0 }, look: 'alpine' },
  { key: 'jungle', name: 'Verdance', tag: 'Rainforest river town', traits: ['Dense rainforest', 'Tropical downpours', 'Muddy tracks'], col: 0x2fbe62,
    pal: { grassA: 0x3a7a2a, grassB: 0x4a8e30, dry: 0x6a8a3a, forest: 0x1a4a22, mead: 0x428a2c, sand: 0xc8b48a, dirt: 0x6a4a2a, rock: 0x5a6a5a, rockD: 0x3a463a, gravel: 0x7a7a5a },
    pave: 0x8a8a7a, paveAmt: 0.55, snowLine: 230,
    tree: { dens: 2.1, mix: [['palm', 0.45], ['oak', 0.45], ['scrub', 0.1]], rocks: [4, 7, 0], bush: 0.7 },
    sky: { grey: 0.25, mist: 0.6, warm: 0.2, dust: 0 }, wx: { rain: 0.55 },
    arch: { bc: [0xf2a0b0, 0xf2d060, 0x60c8c0, 0xf2f0e8, 0xe08050], mc: [0xf0b8a0, 0x80d0c8, 0xf0e090], hc: [0xf4c0c8, 0xf4dc80, 0x80d8d0, 0xf8f4ec, 0xe89a70], rc: [0x5a3a2a, 0x3a6a3a, 0xc0603a],
      roof: 'low', hr: 2.4, dtH: [12, 26], midH: [8, 14], extra: 'palms' },
    mod: { grip: 0.94, gripOff: 0.76, traffic: 0.6, peds: 0.8, heat: 0.8, fine: 0.8 }, look: 'beach' },
  { key: 'metro', name: 'Neo Haven', tag: 'Neon megacity', traits: ['Megatowers and neon', 'Gridlock traffic', 'Strict police, biggest fines'], col: 0xd05aff,
    pal: { grassA: 0x4a6a3a, grassB: 0x5a7a40, dry: 0x8a8a5a, forest: 0x2a4a30, mead: 0x527a3c, sand: 0xc8c0a8, dirt: 0x6a6050, rock: 0x6a6c72, rockD: 0x44464c, gravel: 0x8a8a8c },
    pave: 0x6e7278, paveAmt: 0.99, snowLine: 170,
    tree: { dens: 0.35, mix: [['cypress', 0.5], ['oak', 0.5]], rocks: [0, 2], bush: 0.2 },
    sky: { grey: 0.15, mist: 0.15, warm: 0, dust: 0, smog: 0.55 }, wx: { rain: 0.15 },
    arch: { bc: [0x2a3040, 0x3a3a5a, 0x1e2230, 0x4a3a6a, 0x2a4a5a, 0x5a6a80], mc: [0x3a4050, 0x4a4a6a, 0x2a3040, 0x5a5070], hc: [0xa8a8b8, 0x8a8aa0, 0xc8c8d4], rc: [0x2a2a30, 0x3a3a44, 0x1a1a20],
      roof: 'flat', hr: 0, dtH: [90, 240], midH: [36, 72], extra: 'glass' },
    mod: { grip: 1.0, gripOff: 0.95, traffic: 1.6, peds: 1.4, heat: 1.5, fine: 1.6 }, look: 'suit' }
];
const Biome = { w: new Float32Array(16), w0: 1, top: -1, tw: 0, n: 0, ready: false, atm: { grey: 0, mist: 0, warm: 0, dust: 0, cold: 0, smog: 0, rain: 0, snow: 0, wdust: 0 } };
const BIO_IN = 1000, BIO_OUT = 1900;
const _bcA = new THREE.Color(), _bcB = new THREE.Color();
Biome.prep = function () {
  if (this.ready) return; this.ready = true;
  for (const R of REG) {
    R.P = {}; for (const k in R.pal) R.P[k] = lc(R.pal[k]);
    const A = R.arch; A.B = A.bc.map(lc); A.M = A.mc.map(lc); A.H = A.hc.map(lc); A.R = A.rc.map(lc); R.paveC = lc(R.pave);
  }
};
Biome.reg = (i) => REG[i % REG.length];
/* weights of every region at a point; w0 is what is left for the default island */
Biome.at = function (x, z) {
  if (!this.ready) this.prep();
  const w = this.w, n = Math.min(towns.length, 16); let s = 0, top = -1, tw = 0, dmin = 1e9;
  for (let i = 0; i < n; i++) {
    const T = towns[i], dx = x - T.cx, dz = z - T.cz, d = Math.sqrt(dx * dx + dz * dz), q = 1 / (d + 150), v = q * q * q;   /* nearest town dominates, borders blend smoothly */
    w[i] = v; s += v; if (d < dmin) dmin = d;
  }
  const f = 1 - sstep(BIO_IN, BIO_OUT, dmin), k = s > 0 ? f / s : 0;
  for (let i = 0; i < n; i++) { const v = w[i] * k; w[i] = v; if (v > tw) { tw = v; top = i; } }
  this.w0 = 1 - f; this.top = top; this.tw = tw; this.n = n; return this;
};
/* blended palette entry (call Biome.at first); out is a THREE.Color */
Biome.col = function (name, base, out) {
  if (this.w0 > 0.999) return out.copy(base);
  out.copy(base).multiplyScalar(this.w0);
  for (let i = 0; i < this.n; i++) { const v = this.w[i]; if (v < 0.002) continue; const c = REG[i % REG.length].P[name] || base; out.r += c.r * v; out.g += c.g * v; out.b += c.b * v; }
  return out;
};
Biome.num = function (key, sub, def) {
  let s = this.w0 * def;
  for (let i = 0; i < this.n; i++) { const v = this.w[i]; if (v < 0.002) continue; const R = REG[i % REG.length], o = sub ? R[sub] : R, q = o && o[key] != null ? o[key] : def; s += q * v; }
  return s;
};
/* gameplay modifier at a world position (blends smoothly across region borders) */
Biome.mod = function (x, z, key) { this.at(x, z); return this.num(key, 'mod', 1); };
/* pick a region for a scatter point: returns REG entry or null for the default island */
Biome.pick = function (r) {
  if (r < this.w0) return null; let a = this.w0;
  for (let i = 0; i < this.n; i++) { a += this.w[i]; if (r < a) return REG[i % REG.length]; }
  return this.top >= 0 ? REG[this.top % REG.length] : null;
};

/* ---------- terrain shape ---------- */
const SHAPE = {
  harbor(x, z, h, v, d, T) { const r = sstep(440, 800, d) * v, t = T.baseH - 4 + fbm(x * 0.004 + 2, z * 0.004, 2) * 8; return lerp(h, t, 0.65 * r); },
  desert(x, z, h, v, d, T) {
    const r = sstep(420, 760, d) * v, m = fbm(x * 0.0042 + 3, z * 0.0042 - 9, 3), dn = noise2(x * 0.021, z * 0.016) * 3.2 + noise2(x * 0.007, z * 0.009) * 5;
    const t = T.baseH - 6 + dn + sstep(-0.12, -0.02, m) * 30 + sstep(0.04, 0.14, m) * 28; return lerp(h, t, 0.92 * r);
  },
  farm(x, z, h, v, d, T) { const r = sstep(440, 740, d) * v, t = T.baseH - 1 + fbm(x * 0.0028 + 40, z * 0.0028 + 3, 3) * 9; return lerp(h, t, 0.8 * r); },
  tropic(x, z, h, v, d, T) {
    const r = sstep(440, 740, d) * v, lag = sstep(-0.04, 0.18, noise2(x * 0.0062 + 13, z * 0.0062 - 4));
    const t = 3.4 + noise2(x * 0.011, z * 0.011) * 2.2 + fbm(x * 0.03, z * 0.03, 2) * 0.9 - lag * 12; return lerp(h, t, 0.92 * r);
  },
  alpine(x, z, h, v, d) { const r = sstep(430, 860, d) * v, rid = clamp(1 - Math.abs(noise2(x * 0.0034 + 5, z * 0.0034 + 8) * 1.6), 0, 1); return h + r * (rid * rid * 150 + fbm(x * 0.012, z * 0.012, 3) * 14); },
  lake(x, z, h, v, d, T) {
    const r = sstep(440, 740, d) * v, lk = sstep(-0.08, 0.14, noise2(x * 0.0055 + 21, z * 0.0055 - 17));
    const t = T.baseH - 14 + fbm(x * 0.004 + 9, z * 0.004 - 1, 3) * 10 - lk * 24; return lerp(h, t, 0.85 * r);
  },
  city(x, z, h, v, d, T) { const r = sstep(440, 780, d) * v, t = T.baseH - 6 + fbm(x * 0.003, z * 0.003, 2) * 6; return lerp(h, t, 0.75 * r); },
  /* the outer ring */
  swamp(x, z, h, v, d, T) {   /* low and flat, cut by winding bayous of standing water */
    const r = sstep(430, 680, d) * v, ch = 1 - Math.abs(noise2(x * 0.0042 + 31, z * 0.0042 - 7)) * 2.6, wet = sstep(0.0, 0.45, ch);
    const t = 2.2 + fbm(x * 0.008, z * 0.008, 2) * 1.4 - wet * 5.5; return lerp(h, t, 0.93 * r);
  },
  volcano(x, z, h, v, d, T) {   /* a low plain of old lava flows under Mount Cinder (02_volcano.js) */
    const r = sstep(430, 760, d) * v, t = T.baseH - 3 + fbm(x * 0.006 + 4, z * 0.006, 2) * 5; return lerp(h, t, 0.8 * r);
  },
  savanna(x, z, h, v, d, T) { const r = sstep(440, 780, d) * v, t = T.baseH - 2 + fbm(x * 0.0022 + 8, z * 0.0022, 2) * 5 + sstep(0.35, 0.5, noise2(x * 0.006, z * 0.006)) * 14; return lerp(h, t, 0.9 * r); },
  vineyard(x, z, h, v, d, T) { const r = sstep(440, 760, d) * v, t = T.baseH + 4 + fbm(x * 0.0035 + 1, z * 0.0035 + 6, 3) * 26; return lerp(h, t, 0.85 * r); },
  tundra(x, z, h, v, d, T) { const r = sstep(440, 760, d) * v, t = T.baseH - 2 + fbm(x * 0.004 + 50, z * 0.004, 3) * 9 - sstep(0.2, 0.4, noise2(x * 0.007, z * 0.007)) * 9; return lerp(h, t, 0.85 * r); },
  jungle(x, z, h, v, d, T) {   /* steep green hills with a broad river valley through them */
    const r = sstep(440, 760, d) * v, riv = 1 - sstep(0.02, 0.12, Math.abs(noise2(x * 0.0026 + 70, z * 0.0026 - 30))), t = T.baseH + fbm(x * 0.006, z * 0.006, 3) * 34 + 18 - riv * (T.baseH + 22);
    return lerp(h, t, 0.85 * r);
  },
  metro(x, z, h, v, d, T) { const r = sstep(520, 860, d) * v, t = T.baseH - 4 + fbm(x * 0.003 + 9, z * 0.003, 2) * 5; return lerp(h, t, 0.8 * r); }
};
Biome.shape = function (x, z, h) {
  this.at(x, z); if (this.w0 > 0.999) return h;
  for (let i = 0; i < this.n; i++) {
    const v = this.w[i]; if (v < 0.003) continue; const T = towns[i], dx = x - T.cx, dz = z - T.cz;
    h = SHAPE[REG[i % REG.length].key](x, z, h, v, Math.sqrt(dx * dx + dz * dz), T);
  }
  return h;
};

/* ---------- ground colour extras (called from terrainColor after the base blend) ---------- */
let _TC = null;
function biomeTints() { return _TC || (_TC = { wheat: lc(0xcdb257), green: lc(0x6f9f3a), plow: lc(0x7a5a3a), pale: lc(0x9ab34e), band1: lc(0xb5683d), band2: lc(0x8a4a2e), ripple: lc(0xc9a56c), beach: lc(0xf2e6bc), conc: lc(0x6c6e70), moss: lc(0x3d6a30), mud: lc(0x4a4030), ash: lc(0x2a2828), lava: lc(0xc0401a), lava2: lc(0x1a1414), gold: lc(0xd8b456), vine: lc(0x3e6a26), soil: lc(0x8a5434), frost: lc(0xe8eef2), deep: lc(0x1e5a24) }); }
Biome.tint = function (x, z, h, slope, c) {
  if (this.w0 > 0.999) return; const t = biomeTints();
  for (let i = 0; i < this.n; i++) {
    const v = this.w[i]; if (v < 0.01) continue; const key = REG[i % REG.length].key, flat = 1 - sstep(0.06, 0.22, slope);
    if (key === 'farm') {
      const gx = Math.floor((x + z * 0.12) / 96), gz = Math.floor((z - x * 0.08) / 140), hh = ihash(gx, gz, 91), f = v * flat * (1 - sstep(60, 90, h)) * 0.82;
      if (hh < 0.3) c.lerp(t.wheat, f); else if (hh < 0.52) c.lerp(t.green, f); else if (hh < 0.7) c.lerp(t.plow, f * 0.9); else if (hh < 0.84) c.lerp(t.pale, f);
    } else if (key === 'desert') {
      const band = 0.5 + 0.5 * Math.sin(h * 0.62 + noise2(x * 0.01, z * 0.01) * 3), sl = sstep(0.1, 0.38, slope);
      c.lerp(band > 0.5 ? t.band1 : t.band2, sl * v * 0.75); c.lerp(t.ripple, (noise2(x * 0.05, z * 0.02) * 0.5 + 0.5) * 0.28 * v * flat);
    } else if (key === 'tropic') { c.lerp(t.beach, (1 - sstep(4.2, 8.5, h)) * v * 0.95 * (1 - sstep(0.25, 0.5, slope))); }
    else if (key === 'harbor') { if (ihash(Math.floor(x / 60), Math.floor(z / 60), 33) < 0.3) c.lerp(t.conc, 0.75 * v * flat); }
    else if (key === 'lake') { c.lerp(t.moss, sstep(0.1, 0.5, noise2(x * 0.01, z * 0.01)) * 0.35 * v * flat); }
    else if (key === 'swamp') { c.lerp(t.mud, (0.5 + 0.5 * noise2(x * 0.02, z * 0.02)) * 0.45 * v * flat); c.lerp(t.moss, sstep(0.1, 0.5, noise2(x * 0.013 + 3, z * 0.013)) * 0.4 * v); }
    else if (key === 'volcano') { c.lerp(t.ash, 0.55 * v); if (noise2(x * 0.012, z * 0.012) > 0.32) c.lerp(t.lava2, 0.6 * v * flat); }
    else if (key === 'savanna') { c.lerp(t.gold, (0.5 + 0.5 * noise2(x * 0.004, z * 0.004)) * 0.5 * v * flat); }
    else if (key === 'vineyard') { const row = 0.5 + 0.5 * Math.sin((x * 0.8 + z * 0.33) * 0.9), plot = ihash(Math.floor(x / 110), Math.floor(z / 90), 57) < 0.55; if (plot) c.lerp(row > 0.55 ? t.vine : t.soil, 0.7 * v * flat * (1 - sstep(70, 95, h))); }
    else if (key === 'tundra') { c.lerp(t.frost, (0.55 + 0.45 * noise2(x * 0.01, z * 0.01)) * 0.6 * v); }
    else if (key === 'jungle') { c.lerp(t.deep, sstep(0.0, 0.4, noise2(x * 0.008, z * 0.008)) * 0.45 * v); }
  }
};
