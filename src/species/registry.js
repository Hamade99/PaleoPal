/* Species registry, field notes and coats
   Part of Paleopal. Load order matters; see build.py. */

/* --------------------------- species registry ------------------------------ */
const SPECIES = {
  rex: {
    id:'rex', draw:drawRex, spec:REX_SPEC, scale:.82, speed:15, strideBase:.46*46,
    name:'Tyrannosaurus rex', common:'T. rex', diet:'carnivore',
    likes:['fish','meat'], dislikes:['fern'],
    era:'Late Cretaceous, 68-66 million years ago, western North America',
    facts:[
      'Its bite is the strongest measured for any land animal, around 35,000 newtons.',
      'Work on tooth wear and jaw foramina points to lips covering the teeth, so a closed mouth showed none of them.',
      'Belly ribs called gastralia made the torso barrel-shaped rather than lean.',
      'Each hand has exactly two fingers, and the palms faced inward, not down.',
      'Both eyes face forward, so it judged distance the way a hawk does.'
    ],
    checks:['Lips covering the teeth','Deep barrel torso','Two fingers, palms inward',
            'Level spine, tail as counterweight','Keratin row down the neck','Forward-facing eyes']
  },
  trike: {
    id:'trike', draw:drawTrike, spec:TRI_SPEC, scale:.86, speed:10, strideBase:.34*41,
    name:'Triceratops horridus', common:'Triceratops', diet:'herbivore',
    likes:['fern','cycad'], dislikes:['fish'],
    era:'Late Cretaceous, 68-66 million years ago, Hell Creek',
    facts:[
      'Horn cores grew keratin sheaths that ran past the bone, so living horns were longer than the skeleton shows.',
      'The frill is solid bone, ringed with small knobs called epoccipitals.',
      'Skin impressions show large scales with scattered low nubbins, not the spines older art gave it.',
      'A jugal horn juts down from each cheek, below the eye.',
      'T. horridus carried a long snout and only a small nasal horn.'
    ],
    checks:['Horns above the eyes, sheathed long','Solid frill with rim knobs','Hooked rostral beak',
            'Jugal horn on each cheek','Nubbin feature scales','Upright hind legs, elbows held out']
  },
  brachio: {
    id:'brachio', draw:drawBrachio, spec:BRA_SPEC, scale:.66, speed:5.5, strideBase:.30*46,
    name:'Brachiosaurus altithorax', common:'Brachiosaurus', diet:'herbivore',
    likes:['berry','cycad'], dislikes:['meat'],
    era:'Late Jurassic, 154-150 million years ago, North America',
    facts:[
      'The forelimbs run about 1.2 times the length of the hindlimbs, which is why the back slopes backward.',
      'The neck was probably held near sixty degrees with a slight S-curve, not straight up like a mast.',
      'A hump of tall vertebral spines over the shoulders anchored the neck muscles.',
      'Its nasal chambers formed a crest on the roof of a very small skull.',
      'The tail is short for a sauropod, and one big thumb claw sits on each forefoot.'
    ],
    checks:['Forelimbs longer than hindlimbs','Back sloping down to the hips','Shoulder hump at the neck base',
            'S-curved neck near sixty degrees','Nasal crest on the skull','Thumb claw on each forefoot']
  }
};


/* --------------------------------- skins -----------------------------------
   A skin swaps the three body ramps and paints an optional pattern onto the
   mark layer. Patterns are deterministic so a coat does not crawl between
   animation frames.
   -------------------------------------------------------------------------- */
const SKINS = {
  rex: [
    { id:'wild',   name:'Wild type', cost:0,   pattern:'none',
      skin:'#7e9c54', belly:'#b8bd80', crest:'#5b7940', mark:'#4a6634',
      note:'The olive coat it hatched in.' },
    { id:'ash',    name:'Ashfall',   cost:70,  pattern:'stripes',
      skin:'#6f7a72', belly:'#a9b0a2', crest:'#4a534d', mark:'#39413c',
      note:'Cold grey with charcoal banding down the flank.' },
    { id:'ember',  name:'Ember',     cost:120, pattern:'patches',
      skin:'#a8603a', belly:'#d69a5e', crest:'#7c4224', mark:'#71321a',
      note:'Rust and scorch marks. Loud, and it knows it.' },
    { id:'canopy', name:'Canopy',    cost:170, pattern:'speckle',
      skin:'#4f7a4a', belly:'#9dbd7a', crest:'#395c37', mark:'#93b25c',
      note:'Deep forest green flecked with light through leaves.' }
  ],
  trike: [
    { id:'wild',   name:'Wild type', cost:0,   pattern:'none',
      skin:'#ab7040', belly:'#ca9b64', crest:'#8a5228', mark:'#7a4522',
      note:'The tan coat it hatched in.' },
    { id:'chalk',  name:'Chalk',     cost:70,  pattern:'spots',
      skin:'#c3ab8c', belly:'#e6d8bc', crest:'#95805f', mark:'#8a7050',
      note:'Bleached bone with dark rosettes.' },
    { id:'ochre',  name:'Ochre',     cost:120, pattern:'stripes',
      skin:'#c26a30', belly:'#e8a75c', crest:'#8e4620', mark:'#6f2f18',
      note:'A display animal. Banding runs the whole body.' },
    { id:'basalt', name:'Basalt',    cost:170, pattern:'patches',
      skin:'#5c6470', belly:'#98a1ad', crest:'#3f4650', mark:'#333944',
      note:'Volcanic grey-blue with darker plates.' }
  ],
  brachio: [
    { id:'wild',   name:'Wild type', cost:0,   pattern:'none',
      skin:'#71958a', belly:'#a9ba8e', crest:'#88a894', mark:'#5c7f74',
      note:'The sage coat it hatched in.' },
    { id:'dune',   name:'Dune',      cost:70,  pattern:'patches',
      skin:'#b9a173', belly:'#ded0a2', crest:'#c6b088', mark:'#8c7548',
      note:'Sand and dry grass. Vanishes on the floodplain.' },
    { id:'slate',  name:'Slate',     cost:120, pattern:'stripes',
      skin:'#6d7d92', belly:'#a9b6c4', crest:'#7f8fa2', mark:'#3f4b5c',
      note:'Storm grey with vertical shadow banding.' },
    { id:'fernwood',name:'Fernwood', cost:170, pattern:'spots',
      skin:'#4e7a63', belly:'#9dba8e', crest:'#5f8a72', mark:'#8fb27c',
      note:'Wet forest green dappled with pale rings.' }
  ]
};
function skinOf(spId, skinId){
  const list = SKINS[spId];
  return list.find(k => k.id === skinId) || list[0];
}
/* patterns are drawn in local sprite units and masked to the body by the
   compositor, so they can be laid down as simple full-field shapes */
function paintPattern(g, kind){
  if (!kind || kind === 'none') return;
  if (kind === 'stripes'){
    for (let i=0;i<17;i++){
      const x = -110 + i*14;
      tube(g, [[x-5,-140],[x+3,-72],[x+10,4]], [5.5, 6.5, 4.5]);
    }
    return;
  }
  if (kind === 'spots'){
    for (let i=0;i<64;i++){
      const x = -110 + ((i*47) % 232);
      const y = -4 - ((i*61) % 132);
      oval(g, x, y, 3.6, 3.0);
    }
    return;
  }
  if (kind === 'speckle'){
    for (let i=0;i<170;i++){
      const x = -110 + ((i*29) % 232);
      const y = -2 - ((i*43) % 136);
      oval(g, x, y, 1.5, 1.3);
    }
    return;
  }
  if (kind === 'patches'){
    const pts = [[-66,-96],[-14,-74],[32,-100],[74,-64],[-44,-42],[12,-36],
                 [56,-28],[-80,-58],[92,-48],[-30,-112],[46,-120],[8,-58]];
    pts.forEach((q,i) => oval(g, q[0], q[1], 12 + (i%3)*5, 8 + (i%2)*5));
  }
}

