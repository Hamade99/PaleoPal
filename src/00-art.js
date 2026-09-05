/* ==========================================================================
   PIXEL ART
   Every small sprite in the game as data: the action icons, the meter glyphs,
   the case buttons, the headgear, the food, the mess and the heart.

   All of it used to be hand-written fillRect calls buried in three different
   modules — a hundred and forty lines of `g.fillRect(3,4,2,1)` that could only
   be changed by someone who could read them as a picture in their head. As
   rows of characters it is editable by eye in a text editor, and by hand in
   tools/editor.html.

   Each entry is a palette and one character per pixel: a space is
   transparent, and 0-9 then a-z index into `pal`. `ox`/`oy` mark where the
   drawing origin sits inside the grid, for the sprites that are drawn around
   a point rather than from a corner.

   The outline every icon and hat wears is NOT stored here. It is a pass over
   the finished grid in `pixCanvas`, so an edit cannot leave a sprite with a
   half-drawn border. Nothing here is baked at load: the renderers cache.
   ========================================================================== */
/*<data:PIX>*/
const PIX = {
  'icon.feed': { w:12, h:12,
    pal:['#a04a34','#82382a','#c46a4c','#d8d0b4'], rows:[
      '            ',
      '            ',
      '            ',
      ' 0000000   3',
      '102222001 33',
      '10222200333 ',
      '10000000333 ',
      '100000001 33',
      ' 0011111   3',
      '            ',
      '            ',
      '            '
    ] },
  'icon.play': { w:15, h:19,
    pal:['#2f6f6a','#a7dbd3','#5fb0a5','#df0000','#914848','#b4a329','#272727','#ffffff','#ffd700','#a45200','#292497','#590000'], rows:[
      '    8588858    ',
      '   888773338   ',
      '  88777733338  ',
      ' 8337777333888 ',
      '833377773377788',
      '833337773777778',
      '83333388a777778',
      '877777868773338',
      '877777a88333338',
      '877773377333338',
      '883333377733388',
      ' 8833337777338 ',
      '  88333777788  ',
      '   883377788   ',
      '    8588558    ',
      '     bbbbb     ',
      '      bbb      ',
      '     bbbbb     ',
      '    bbbbbbb    '
    ] },
  'icon.wash': { w:12, h:12,
    pal:['#4b7f99','#7fb2c9','#e8f4fa','#d6ecf4'], rows:[
      '        2   ',
      '    000     ',
      '    110   2 ',
      '   01100    ',
      '   13310    ',
      '  0133100   ',
      '  0111100   ',
      '  0111100  2',
      '  0011100   ',
      '   01110    ',
      '   00000 2  ',
      '           2'
    ] },
  'icon.care': { w:12, h:12,
    pal:['#8f3f26','#c2603c','#f2ded0','#e4e3cb'], rows:[
      '            ',
      ' 0000  0000 ',
      '001100001100',
      '011111111110',
      '011112311110',
      '011112311110',
      '011222233110',
      '001232333100',
      ' 0111331110 ',
      '  01133110  ',
      '   011110   ',
      '    0000    '
    ] },
  'icon.shop': { w:12, h:12,
    pal:['#5c4726','#b08a4a','#8a6a36','#d9a83f'], rows:[
      '    0000    ',
      '   0    0   ',
      '   0    0   ',
      '   0    0   ',
      ' 1111111110 ',
      ' 1111111110 ',
      ' 2222222220 ',
      ' 2233333320 ',
      ' 2233333320 ',
      ' 2222222220 ',
      ' 2222222220 ',
      ' 0000000000 '
    ] },
  'icon.coin': { w:12, h:12,
    pal:['#8a6a1e','#d9a83f','#f0d888'], rows:[
      '            ',
      '   011000   ',
      '  02111100  ',
      ' 0122001100 ',
      ' 0110000100 ',
      ' 0111001100 ',
      ' 0111001100 ',
      ' 0110000100 ',
      ' 0111001100 ',
      '  01111100  ',
      '   000000   ',
      '            '
    ] },
  'icon.hunger': { w:12, h:12,
    pal:['#d8d0b4','#82382a','#a04a34','#c46a4c'], rows:[
      '            ',
      '       0000 ',
      '       0000 ',
      '  11111110  ',
      ' 222222221  ',
      ' 233322221  ',
      ' 233322221  ',
      ' 233322221  ',
      ' 222222221  ',
      ' 111111111  ',
      ' 111111111  ',
      '            '
    ] },
  'icon.energy': { w:12, h:12,
    pal:['#d9c04a','#f4e79a','#8a6a1e'], rows:[
      '      000   ',
      '     1102   ',
      '    1102    ',
      '   0000     ',
      '  0000000   ',
      '  2220002   ',
      '    0002    ',
      '   0002     ',
      '  0002      ',
      '  002       ',
      '  22        ',
      '            '
    ] },
  'icon.hygiene': { w:12, h:12,
    pal:['#4b7f99','#7fb2c9','#d6ecf4'], rows:[
      '     00     ',
      '     00     ',
      '    1110    ',
      '   121110   ',
      '   122110   ',
      '  01221100  ',
      '  01111100  ',
      '  01111100  ',
      '   011110   ',
      '    0000    ',
      '            ',
      '            '
    ] },
  'icon.joy': { w:12, h:12,
    pal:['#c96f86','#8f3050','#f0a8b8'], rows:[
      '            ',
      '  001  001  ',
      ' 1220000001 ',
      ' 1220000001 ',
      ' 1000000011 ',
      '  10000011  ',
      '   100011   ',
      '    1111    ',
      '     11     ',
      '            ',
      '            ',
      '            '
    ] },
  'icon.sound': { w:12, h:12,
    pal:['#3a2408','#1d4a33'], rows:[
      '            ',
      '    0     1 ',
      '   00    1  ',
      '  000   11  ',
      '00000  1 1  ',
      '00000  1 1  ',
      '00000  1 1  ',
      '00000  1 1  ',
      '  000   11  ',
      '   00    1  ',
      '    0     1 ',
      '            '
    ] },
  'icon.mute': { w:12, h:12,
    pal:['#3a2408','#c2603c'], rows:[
      '            ',
      '    0       ',
      '   00       ',
      '  000  1   1',
      '00000   1 1 ',
      '00000    1  ',
      '00000   1 1 ',
      '00000  1   1',
      '  000       ',
      '   00       ',
      '    0       ',
      '            '
    ] },
  'icon.bone': { w:12, h:12,
    pal:['#efe6cf','#b8ad90'], rows:[
      '            ',
      '            ',
      '            ',
      ' 000    000 ',
      ' 000    000 ',
      ' 1100000011 ',
      '   000000   ',
      ' 0011111001 ',
      ' 001    001 ',
      ' 111    111 ',
      '            ',
      '            '
    ] },
  'icon.nest': { w:12, h:12,
    pal:['#efe3c4','#cfc3a4','#6b5230','#8a6a3c'], rows:[
      '            ',
      '            ',
      '            ',
      '   000      ',
      '  00000111  ',
      '  000011111 ',
      ' 2000011111 ',
      '233333333332',
      '222222222222',
      '333333333333',
      '222222222222',
      '            '
    ] },
  'hat.frond': { w:12, h:11,
    pal:['#6f9c55'], rows:[
      '            ',
      '    00 00   ',
      '  0000 0000 ',
      '  00     00 ',
      '   00   00  ',
      '   0000 00  ',
      '     00     ',
      '     00     ',
      '     00     ',
      '     00     ',
      '            '
    ] },
  'hat.cap': { w:12, h:11,
    pal:['#b08a4a','#8a6a36'], rows:[
      '            ',
      '            ',
      '   000000   ',
      '   000000   ',
      '   000000   ',
      '   000000   ',
      ' 1111111111 ',
      ' 1111111111 ',
      '            ',
      '            ',
      '            '
    ] },
  'hat.goggles': { w:12, h:11,
    pal:['#3a4d55','#9fd2e0'], rows:[
      '            ',
      '            ',
      '            ',
      ' 0000000000 ',
      ' 0111001110 ',
      ' 0111001110 ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            '
    ] },
  'hat.cone': { w:12, h:11,
    pal:['#d95f7f','#5fb0a5'], rows:[
      '            ',
      '     00     ',
      '     00     ',
      '    0000    ',
      '    0000    ',
      '   000000   ',
      '   000000   ',
      '  11111111  ',
      '  11111111  ',
      '            ',
      '            '
    ] },
  'hat.hardhat': { w:12, h:11,
    pal:['#c48c1c','#e0a92f'], rows:[
      '            ',
      '     00     ',
      '   110011   ',
      '   111111   ',
      '   111111   ',
      '   111111   ',
      ' 0000000000 ',
      ' 0000000000 ',
      '            ',
      '            ',
      '            '
    ] },
  'hat.crown': { w:12, h:11,
    pal:['#d9a83f','#c04848'], rows:[
      '            ',
      ' 00  00  00 ',
      ' 00  00  00 ',
      ' 00  00  00 ',
      ' 0000000000 ',
      ' 0000110000 ',
      ' 0000110000 ',
      '            ',
      '            ',
      '            ',
      '            '
    ] },
  'item.berry': { w:12, h:10, ox:2, oy:4,
    pal:['#4e7a4a','#b83b45','#8f2b36','#e08a92'], rows:[
      '            ',
      '            ',
      '    0       ',
      '    0       ',
      '  11112     ',
      '  13112     ',
      '  11112     ',
      '  22222     ',
      '            ',
      '            '
    ] },
  'item.fish': { w:12, h:10, ox:2, oy:4,
    pal:['#7fa3b8','#1a140e','#5b7c90','#c9dde6'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '  01000022  ',
      '  03300022  ',
      '  22222222  ',
      '            ',
      '            ',
      '            '
    ] },
  'item.fern': { w:12, h:10, ox:2, oy:4,
    pal:['#3f6440','#6f9c55','#8fb763'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '    0       ',
      '   102      ',
      '  21021     ',
      '   102      ',
      '    0       ',
      '            '
    ] },
  'item.cycad': { w:12, h:10, ox:2, oy:4,
    pal:['#a8863c','#8a6b2c','#d0ae5c','#5a4a2a'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '   0001     ',
      '   0201     ',
      '   0001     ',
      '   1111     ',
      '    33      ',
      '            '
    ] },
  'item.meat': { w:12, h:10, ox:2, oy:4,
    pal:['#a04a34','#c46a4c','#efe9d8','#82382a'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '  00000     ',
      '  01100     ',
      '  0000022   ',
      '  3333322   ',
      '            ',
      '            '
    ] },
  'item.cake': { w:12, h:10, ox:2, oy:4,
    pal:['#b83b45','#f0dcae','#d1a05e','#b8823f'], rows:[
      '            ',
      '            ',
      '            ',
      '    00      ',
      '  110011    ',
      '  222222    ',
      '  222222    ',
      '  222222    ',
      '  333333    ',
      '            '
    ] },
  'item.rock': { w:12, h:10, ox:2, oy:4,
    pal:['#8b8578','#a8a294','#6e6a5e'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '  000112    ',
      '  000002    ',
      '  000002    ',
      '  222222    ',
      '            ',
      '            '
    ] },
  'mess': { w:10, h:9, ox:4, oy:7,
    pal:['#6b4322','#8a5c33','#513218'], rows:[
      '          ',
      '   000    ',
      '   110    ',
      '  00000   ',
      '  00000   ',
      ' 0110002  ',
      ' 0000002  ',
      ' 2222222  ',
      '          '
    ] },
  'heart': { w:8, h:7, ox:0, oy:1,
    pal:['#8f2f46','#f6b3c0','#e2697c'], rows:[
      ' 00 00  ',
      '0112220 ',
      '0122220 ',
      '0022200 ',
      ' 00200  ',
      '  000   ',
      '   0    '
    ] },
};
/*</data>*/

/* Per-stage multipliers. Every feature that grows on its own schedule gets its
   own column — merging any two of them has produced a bad sprite at least once.

   A scale column and a set of ratios is not growth. With `s` doing most of the
   work the juvenile, subadult and adult were one animal at three sizes with a
   slightly smaller head each time, and the only stage that read as its own
   thing was the hatchling. Growing up changes what an animal *has*, not only
   how big the parts are, so four of these columns turn features on and off
   rather than scaling them:

   `muzzle` is snout DEPTH, and it is separate from `snout`, which is snout
   length. A young tyrannosaur has a shallow, narrow muzzle in front of a large
   braincase; the deep boxy skull is an adult feature and arrives late. Driving
   both off one number gives a hatchling either an adult's slab of a face or a
   pinched adult.

   `bulk` is how deep the trunk and neck are for a given length. Juveniles are
   slab-sided and leggy, adults are barrel-chested with a thick neck. It is the
   difference you actually see across a room.

   `torso` is trunk LENGTH. Young animals are short-bodied and big-headed; the
   body catches up last.

   `fuzz` is protofeather coverage. Juvenile tyrannosaurs are reconstructed
   with a substantial coat that reduces with age, which is both well supported
   and the single most visible thing that can change between two stages of the
   same animal.

   `frill` is separate from `horn` for the reason `snout` is separate from
   `head`: a baby Triceratops already has a frill, deeply scalloped and
   obvious, while its horns are barely stubs.

   `hornBend` is the ontogenetic sequence Horner and Goodwin read off a series
   of ten skulls: the postorbital horns start as straight stubs, curve
   backward in juveniles, straighten out in subadults, then recurve forward in
   adults. Negative is backward, positive forward. */
/*<data:STAGE>*/
const STAGE = [
  {
    key:'hatchling',
    label:'Hatchling',
    s:.44,
    head:1.62,
    snout:.58,
    muzzle:.62,
    neck:.44,
    limb:.68,
    tail:.54,
    bulk:1.34,
    torso:.7,
    fuzz:1,
    horn:.14,
    frill:.5,
    hornBend:0
  },
  {
    key:'juvenile',
    label:'Juvenile',
    s:.64,
    head:1.38,
    snout:.76,
    muzzle:.74,
    neck:.68,
    limb:.83,
    tail:.76,
    bulk:1.12,
    torso:.84,
    fuzz:.68,
    horn:.48,
    frill:.7,
    hornBend:-1
  },
  {
    key:'subadult',
    label:'Subadult',
    s:.83,
    head:1.18,
    snout:.9,
    muzzle:.89,
    neck:.87,
    limb:.93,
    tail:.9,
    bulk:1.04,
    torso:.94,
    fuzz:.3,
    horn:.8,
    frill:.86,
    hornBend:-.15
  },
  {
    key:'adult',
    label:'Adult',
    s:1,
    head:1.06,
    snout:1,
    muzzle:1,
    neck:1,
    limb:1,
    tail:1,
    bulk:1,
    torso:1,
    fuzz:.06,
    horn:1,
    frill:1,
    hornBend:1
  }
];
/*</data>*/

/* ---------------------- proportions, per species ---------------------------
   These were literals scattered through fifty lines of control points inside
   each draw function, which made "extend the tail" a job for someone willing
   to read the whole function first. Every number is in local units at adult
   size; the STAGE columns above multiply them. tools/editor.html puts a
   slider on each one.

   Where a draw function needs two stations at a fixed ratio — the four points
   down a tail, say — they are written as exact fractions of the length here
   (TL*23/72), not as rounded decimals. TL*.32 is 23.04, and the sprite moves.
   -------------------------------------------------------------------------- */
/*<data:REX_TUNE>*/
const REX_TUNE = {
  hipH:46,
  shoulder:18,
  backH:24,
  withersH:25,
  bellyD:9,
  neckLen:26,
  neckDrop:10,
  headLen:23,
  headDepth:15.5,
  tailLen:72,
  tailBase:18,
  armLen:11,
  fuzzLen:5.2
};
/*</data>*/
/*<data:TRI_TUNE>*/
const TRI_TUNE = {
  hipH:41,
  shoulder:16,
  hipBack:26,
  withersH:25,
  backH:20,
  bellyD:14,
  neckLen:20,
  neckThick:15,
  headLen:22.5,
  headDepth:10.5,
  frillW:17,
  frillH:22,
  frillTilt:-.24,
  hornLen:1.85,
  tailLen:62,
  epi:.08
};
/*</data>*/
/*<data:BRA_TUNE>*/
const BRA_TUNE = {
  hindH:46,
  foreRatio:1.22,
  shoulder:14,
  hipBack:30,
  bodyD:44,
  neckLen:58,
  neckThick:26,
  headLen:16,
  headDepth:8,
  crestH:2.05,
  tailLen:86
};
/*</data>*/

/* ------------------------- colours, per species ---------------------------
   The material ramps each species is built from. `beak` is optional and
   falls back to `horn`. */
/*<data:REX_SPEC>*/
const REX_SPEC = {
  skin:'#7e9c54',
  belly:'#b8bd80',
  crest:'#5b7940',
  horn:'#e9dfba',
  mouth:'#8e4a45',
  outline:'#241d13'
};
/*</data>*/

/* The Triceratops carries two extra materials.

   `shield` is the frill, pulled well away from the body ramp: on the flank
   colours the shield was separated from the neck by nothing but the outline,
   and a shield that does not read as a shield is most of this animal's
   silhouette thrown away.

   `beak` is the rostral and predentary. On the horn ramp they came out
   near-white, which put two blobs of bone on the front of the face with no
   edge between them and the horn sheaths above. Keratin, but duller. */
/*<data:TRI_SPEC>*/
const TRI_SPEC = {
  skin:'#a06635',
  belly:'#c8975e',
  crest:'#7d4a22',
  horn:'#efe6c8',
  shield:'#cfa068',
  beak:'#b3925e',
  mouth:'#7e3a30',
  outline:'#26190f'
};
/*</data>*/

/*<data:BRA_SPEC>*/
const BRA_SPEC = {
  skin:'#71958a',
  belly:'#a9ba8e',
  crest:'#88a894',
  horn:'#e2e3bc',
  mouth:'#4c3a35',
  outline:'#1b2422'
};
/*</data>*/

/* --------------------------------- skins -----------------------------------
   A skin swaps the three body ramps and paints an optional pattern onto the
   mark layer. Patterns are deterministic so a coat does not crawl between
   animation frames.
   -------------------------------------------------------------------------- */
/*<data:SKINS>*/
const SKINS = {
  rex:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#7e9c54',
      belly:'#b8bd80',
      crest:'#5b7940',
      mark:'#4a6634',
      note:'The olive coat it hatched in.'
    },
    {
      id:'ash',
      name:'Ashfall',
      cost:70,
      pattern:'bands',
      skin:'#6f7a72',
      belly:'#a9b0a2',
      crest:'#4a534d',
      mark:'#39413c',
      note:'Cold grey, charcoal banding across the flank into tail rings.'
    },
    {
      id:'ember',
      name:'Ember',
      cost:120,
      pattern:'patches',
      skin:'#a8603a',
      belly:'#d69a5e',
      crest:'#7c4224',
      mark:'#71321a',
      note:'Rust and scorch marks. Loud, and it knows it.'
    },
    {
      id:'canopy',
      name:'Canopy',
      cost:170,
      pattern:'speckle',
      skin:'#4f7a4a',
      belly:'#9dbd7a',
      crest:'#395c37',
      mark:'#93b25c',
      note:'Deep forest green flecked with light through leaves.'
    }
  ],
  trike:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#ab7040',
      belly:'#ca9b64',
      crest:'#8a5228',
      mark:'#7a4522',
      note:'The tan coat it hatched in.'
    },
    {
      id:'chalk',
      name:'Chalk',
      cost:70,
      pattern:'spots',
      skin:'#c3ab8c',
      belly:'#e6d8bc',
      crest:'#95805f',
      mark:'#8a7050',
      note:'Bleached bone with dark rosettes.'
    },
    {
      id:'ochre',
      name:'Ochre',
      cost:120,
      pattern:'bands',
      skin:'#c26a30',
      belly:'#e8a75c',
      crest:'#8e4620',
      mark:'#6f2f18',
      note:'A display animal. Banding follows the ribs and rings the tail.'
    },
    {
      id:'basalt',
      name:'Basalt',
      cost:170,
      pattern:'patches',
      skin:'#5c6470',
      belly:'#98a1ad',
      crest:'#3f4650',
      mark:'#333944',
      note:'Volcanic grey-blue with darker plates.'
    }
  ],
  brachio:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#71958a',
      belly:'#a9ba8e',
      crest:'#88a894',
      mark:'#5c7f74',
      note:'The sage coat it hatched in.'
    },
    {
      id:'dune',
      name:'Dune',
      cost:70,
      pattern:'patches',
      skin:'#b9a173',
      belly:'#ded0a2',
      crest:'#c6b088',
      mark:'#8c7548',
      note:'Sand and dry grass. Vanishes on the floodplain.'
    },
    {
      id:'slate',
      name:'Slate',
      cost:120,
      pattern:'bands',
      skin:'#6d7d92',
      belly:'#a9b6c4',
      crest:'#7f8fa2',
      mark:'#3f4b5c',
      note:'Storm grey, shadow banding down the neck and out the tail.'
    },
    {
      id:'fernwood',
      name:'Fernwood',
      cost:170,
      pattern:'spots',
      skin:'#4e7a63',
      belly:'#9dba8e',
      crest:'#5f8a72',
      mark:'#8fb27c',
      note:'Wet forest green dappled with pale rings.'
    }
  ]
};
/*</data>*/
function skinOf(spId, skinId){
  const list = SKINS[spId];
  return list.find(k => k.id === skinId) || list[0];
}

/* ---------------------- per species, per stage -----------------------------
   STAGE is the growth curve every animal shares, and each species' TUNE table
   is its proportions at adult size. Between them they cover "all tyrannosaurs
   have a shallow muzzle when young" and "this tyrannosaur has a long tail".
   Neither covers "this species, at this age, departs from both" — which is
   most of what growth actually is once you look closely at an animal.

   So: one row per stage per species, and any key in it REPLACES the value it
   names, whether that is a STAGE column or a TUNE key. A key that is absent is
   inherited. Replacement rather than a multiplier, because several of these
   values are legitimately zero or negative — `hornBend` is 0 on a hatchling
   and -1 on a juvenile, and no multiplier can move either of those.

   The Triceratops rows below are the epoccipital depths that used to be a
   table of their own: the rim scallops are deep deltoid knobs on a hatchling
   and low spindles fused into the margin on an adult, which is exactly a
   per-species per-stage value and had no home before this.
   -------------------------------------------------------------------------- */
/*<data:SPECIES_STAGE>*/
const SPECIES_STAGE = {
  rex:[{  }, {  }, {  }, {  }],
  trike:[{ epi:.22 }, { epi:.17 }, { epi:.12 }, {  }],
  brachio:[{  }, {  }, {  }, {  }]
};
/*</data>*/

/* ------------------------------- habitats ---------------------------------
   The palette half of each habitat. The painters that go with them —
   landmark, treeline, floor, and whatever moves — are code and stay in
   04-world.js, which merges the two halves back together.

   `sky` gives the two sky colours for each phase, because the sky is half the
   screen and is the one part that cannot be derived. `ground` gives the six
   ground materials at DAY only: dawn, dusk and night are mixed from them by
   PHASE_MIX.
   -------------------------------------------------------------------------- */
/*<data:BIOME_ART>*/
const BIOME_ART = {
  valley:{
    id:'valley',
    name:'Fern valley',
    cost:0,
    note:'Open ground under a live volcano. Where every animal starts.',
    sky:{
      night:['#0a1124', '#28374f'],
      dawn:['#2c3f70', '#e39a6c'],
      day:['#4d9dc9', '#c3e2d8'],
      dusk:['#2b2854', '#da834b']
    },
    ground:{
      far:'#8fa79d',
      mid:'#6c8b6f',
      tree:'#3e5a44',
      grass:'#78a051',
      dirt:'#a5825a',
      water:'#6fa6b8'
    },
    tint:{
      night:'rgba(16,24,54,.44)',
      dawn:'rgba(196,124,84,.13)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(96,62,116,.20)'
    }
  },
  lagoon:{
    id:'lagoon',
    name:'Salt lagoon',
    cost:130,
    note:'A warm shallow sea behind a bar of pale sand. Sea stacks on the horizon.',
    sky:{
      night:['#08111f', '#1e3448'],
      dawn:['#34497a', '#f0a878'],
      day:['#58a8d6', '#d8ecec'],
      dusk:['#2f2a58', '#e0864c']
    },
    ground:{
      far:'#b7c3c0',
      mid:'#7f9a92',
      tree:'#4a6a52',
      grass:'#a8b47a',
      dirt:'#d6c69a',
      water:'#59a8c0'
    },
    tint:{
      night:'rgba(14,26,56,.42)',
      dawn:'rgba(212,140,88,.14)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(112,64,104,.20)'
    }
  },
  ashfall:{
    id:'ashfall',
    name:'Ash flats',
    cost:170,
    note:'The valley after the mountain woke. Dust in the air and nothing green left standing.',
    sky:{
      night:['#120e1c', '#2e2634'],
      dawn:['#4a3c58', '#e08a5c'],
      day:['#7e8faa', '#d3cdc4'],
      dusk:['#3a2a44', '#d46a3c']
    },
    ground:{
      far:'#8b8496',
      mid:'#6a6472',
      tree:'#3a3640',
      grass:'#6e6a63',
      dirt:'#8e857c',
      water:'#6a7078'
    },
    tint:{
      night:'rgba(20,16,34,.46)',
      dawn:'rgba(200,120,76,.15)',
      day:'rgba(150,132,110,.10)',
      dusk:'rgba(120,64,60,.22)'
    }
  },
  gorge:{
    id:'gorge',
    name:'Fern gorge',
    cost:210,
    note:'A cut in the plateau with a fall at the head of it. Wet, green and loud.',
    sky:{
      night:['#070e18', '#1c2a34'],
      dawn:['#2e3f60', '#dba888'],
      day:['#4f93b0', '#cfe4d6'],
      dusk:['#262848', '#c07a54']
    },
    ground:{
      far:'#7d9285',
      mid:'#55705c',
      tree:'#2e4a38',
      grass:'#5f8f4e',
      dirt:'#6f5c46',
      water:'#7fc0c4'
    },
    tint:{
      night:'rgba(12,22,44,.46)',
      dawn:'rgba(180,124,92,.13)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(84,58,104,.22)'
    }
  },
  boreal:{
    id:'boreal',
    name:'Polar dawn',
    cost:260,
    note:'High-latitude forest under a glacier. Dinosaurs lived here, in the dark half of the year.',
    sky:{
      night:['#060c1a', '#17253c'],
      dawn:['#2a3a68', '#eab48c'],
      day:['#6fa8d0', '#e6eef2'],
      dusk:['#26244e', '#c98a6a']
    },
    ground:{
      far:'#b9c6d6',
      mid:'#8ea0b2',
      tree:'#2d4444',
      grass:'#cdd8e0',
      dirt:'#a9b6c2',
      water:'#6f9ec4'
    },
    tint:{
      night:'rgba(18,30,64,.42)',
      dawn:'rgba(214,150,104,.14)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(80,66,116,.22)'
    }
  }
};
/*</data>*/

/* The growth row and the proportions a species draws with at a given stage,
   with its own overrides folded in. Every draw function starts here rather
   than reading STAGE and its TUNE table directly.

   Cached, because it is called once per bake and a bake happens for every
   frame of every animation — and dropped by artChanged(), like everything
   else the game has worked out in advance. */
const stageCache = new Map();
function artFor(spId, stage){
  const key = spId + '|' + stage;
  if (stageCache.has(key)) return stageCache.get(key);
  const st = Object.assign({}, STAGE[stage]);
  const tune = Object.assign({}, (SPECIES[spId] && SPECIES[spId].tune) || {});
  const adj = (SPECIES_STAGE[spId] || [])[stage] || {};
  for (const k in adj){
    if (k in st) st[k] = adj[k];
    else tune[k] = adj[k];
  }
  const out = { st, tune };
  stageCache.set(key, out);
  return out;
}

/* ---------------------------- drawing from PIX ----------------------------
   Three ways a stored sprite is used, and none of them wants the others'
   behaviour, so they are three functions rather than one with flags.
   -------------------------------------------------------------------------- */

/* Straight onto a context, at a scale, optionally in one flat colour. `flat`
   is what gives a food item the hard outline every animal in this game has:
   stamped four times a pixel out in each direction under the real thing. A
   bounding rectangle will not do it — that comes out as a black plaque. */
function pixDraw(g, id, x, y, s, flat){
  const p = PIX[id];
  if (!p) return;
  s = s || 1;
  const ox = (p.ox || 0), oy = (p.oy || 0);
  for (let r=0;r<p.rows.length;r++){
    const row = p.rows[r];
    for (let c=0;c<row.length;c++){
      const ch = row[c];
      if (ch === ' ') continue;
      g.fillStyle = flat || p.pal[PIX_CH.indexOf(ch)];
      g.fillRect(x + (c-ox)*s, y + (r-oy)*s, s, s);
    }
  }
}
const PIX_CH = '0123456789abcdefghijklmnopqrstuvwxyz';

/* Onto its own canvas, with a hard outline dilated around it. Icons and
   headgear both want this and both used to carry their own copy of the loop.
   Cached, because paintChrome runs about once a second and the shop redraws
   every frame it is open.

   The canvas is a pixel bigger than the sprite on every side. The outline is
   dilated *outward*, so a canvas cut to the sprite's exact size has nowhere to
   put it, and any art pixel touching the edge silently lost its outline on
   that side — eleven of the twenty-nine sprites did, and `icon.play`, which
   fills its box, had none at all on any side. A sprite is art, not a box: it
   should not have to keep a spare row clear to be drawn correctly.

   The pad is published on the canvas because headgear places itself from the
   canvas size and would otherwise ride a pixel high. */
const PIX_PAD = 1;
const pixCache = new Map();
function pixCanvas(id, outline){
  const key = id + '|' + outline;
  if (pixCache.has(key)) return pixCache.get(key);
  const p = PIX[id];
  if (!p) return makeCv(1,1);
  const w = p.w + PIX_PAD*2, h = p.h + PIX_PAD*2;
  const c = makeCv(w, h), g = readCtx(c);
  c.pad = PIX_PAD;
  pixDraw(g, id, (p.ox || 0) + PIX_PAD, (p.oy || 0) + PIX_PAD, 1);
  const d = g.getImageData(0,0,w,h), px = d.data, solid = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++){ if (px[i*4+3] >= 118){ px[i*4+3] = 255; solid[i] = 1; } else px[i*4+3] = 0; }
  const [orr, og, ob] = [1,3,5].map(i => parseInt(outline.slice(i,i+2), 16));
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i = y*w+x; if (solid[i]) continue;
    if ((x>0&&solid[i-1])||(x<w-1&&solid[i+1])||(y>0&&solid[i-w])||(y<h-1&&solid[i+w])){
      px[i*4]=orr; px[i*4+1]=og; px[i*4+2]=ob; px[i*4+3]=255;
    }
  }
  g.putImageData(d,0,0);
  pixCache.set(key, c);
  return c;
}
/* Anything the editor changes has to drop the caches, or the game goes on
   showing what it baked before the edit. */
function pixInvalidate(){ pixCache.clear(); if (typeof HATS === 'object') for (const k in HATS) delete HATS[k]; }

/* Everything the game has baked, dropped in one call. The editor changes a
   number and then has to make the game forget four independent caches — the
   frame cache, the material cache, the pixel cache and the two backdrop
   caches. Forgetting one of them is how an editor ends up showing the old
   sprite on a new palette, so there is one function and it clears them all.
   It is called at runtime, so the caches defined in later modules are there. */
function artChanged(){
  pixInvalidate();
  if (typeof frameCache !== 'undefined') frameCache.clear();
  if (typeof matCache   !== 'undefined') matCache.clear();
  if (typeof warmQueue  !== 'undefined') warmQueue.length = 0;
  if (typeof bgCache    !== 'undefined') bgCache.clear();
  if (typeof skyCache   !== 'undefined') skyCache.clear();
  stageCache.clear();
}
