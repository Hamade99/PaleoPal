/* ==========================================================================
   THE RIG
   An animal as a skeleton and a list of parts, instead of as a function.

   Why this exists, in one line: every shape in this game is a list of points
   that gets hard-quantised into pixels *afterwards*, which means a part can be
   moved, scaled and re-lit for nothing. An ordinary pixel-art game cannot rig
   its sprites, because rotating a bitmap tears it. This one always could, and
   the shapes were simply trapped inside three hundred lines of arithmetic
   working out where to put them.

   So the arithmetic keeps its job and loses everything else. A species now
   computes **joints** — named frames, each with an origin, a scale and a
   rotation, all of them still driven by the growth columns and the pose — and
   everything hanging off those joints is data.

     joint   { x, y, sx, sy, rot }      where a thing is, how big, which way
     vertex  [ joint, ox, oy ]          a point, in that joint's own units
     part    { layer, kind, v, ... }    a shape, on a material, made of points

   A vertex naming a joint is the whole trick. Bind every vertex of a shape to
   one joint and you have a rigid part that follows the skull. Bind the
   vertices of one shape to *different* joints and you have a body that
   stretches between the shoulder and the hip as they move. Same format, and
   the second case is what a torso is.

   Adding a part is adding a row. It animates because its joint animates, it
   grows because its joint scales, it lights because the compositor never knew
   the difference. That is the whole point: nothing downstream can tell how
   many parts there are.

   Not everything wants to be data. A row of epoccipitals generated from a
   count, a leg solved by inverse kinematics, an eye with five states — those
   are functions of something, and a function is the honest way to write them.
   A rig therefore holds both: data parts, and code parts that run in the same
   ordered list so the paint order stays one list rather than two.
   ========================================================================== */

/* Where a vertex actually lands. The joint's scale is applied before its
   rotation, so a part squashes with its joint and then turns with it — a frill
   tipped back is a tipped frill, not a sheared one. */
function rigAt(joints, v){
  const j = joints[v[0]];
  if (!j) return [0, 0];
  const x = v[1] * (j.sx === undefined ? 1 : j.sx);
  const y = v[2] * (j.sy === undefined ? 1 : j.sy);
  if (!j.rot) return [j.x + x, j.y + y];
  const c = Math.cos(j.rot), s = Math.sin(j.rot);
  return [j.x + x*c - y*s, j.y + x*s + y*c];
}
/* How big one unit of a joint is on the canvas, for radii, which have a size
   in each direction. */
const rigScale = (joints, name) => {
  const j = joints[name] || {};
  return [j.sx === undefined ? 1 : j.sx, j.sy === undefined ? 1 : j.sy];
};
/* A tube's width has a size but no direction, so it needs a scale of its own
   and cannot borrow either axis.

   This was got wrong the first time and the way it failed is worth keeping.
   Widths were scaled by the joint's y unit, which on the skull is *head
   depth* — about twenty pixels on an adult. A width of 7, meant as seven
   pixels of horn, came out as a hundred and forty: a disc that swallowed the
   animal, grew the bake box until it hit its cap, and then vanished entirely
   at adult size because by then it was clipped away on every side. The lesson
   is that a joint's axes describe where things are, not how thick they are,
   and a rig needs to say both. */
const rigWidth = (joints, name) => {
  const j = joints[name] || {};
  return j.sw !== undefined ? j.sw : (j.sy === undefined ? 1 : j.sy);
};

/* Draw one part. `kind` is which primitive: the same three the species files
   have always used, because the primitives were never the problem. */
function rigPart(M, joints, p){
  const g = M[p.layer];
  if (!g) return;
  const pts = p.v.map(v => rigAt(joints, v));
  if (p.kind === 'oval'){
    const [sx, sy] = rigScale(joints, p.v[0][0]);
    const j = joints[p.v[0][0]] || {};
    oval(g, pts[0][0], pts[0][1], p.r[0]*sx, p.r[1]*sy, null, j.rot || 0);
    return;
  }
  if (p.kind === 'tube'){
    /* A width belongs to the vertex it is measured at, so it scales with that
       vertex's own joint. A neck that thins toward the skull is one tube whose
       far end is measured in skull units. */
    const w = p.w.map((n, i) => n * rigWidth(joints, p.v[i][0]));
    tube(g, pts, w);
    return;
  }
  blob(g, pts);
}

/* The whole animal: joints first, then every part in order. A code part is
   handed the joints and the pose and draws whatever it likes onto the same
   layers — the ordering is shared, so a generated row of knobs still sits
   between the two data parts it belongs between. */
function drawRig(M, P, rig){
  const joints = rig.joints(P);
  for (const part of rig.parts){
    if (typeof part === 'function') part(M, joints, P);
    else rigPart(M, joints, part);
  }
  return joints;
}

/* --------------------------- added parts ---------------------------------
   The conversion, taken from the additive end first.

   A species still draws itself the way it always has. What it now also does is
   publish its joints — which it had all along, as local variables with names
   like `hx` and `hipY`, computed and then thrown away. Anything in RIG_PARTS
   is drawn against those joints afterwards.

   That is deliberately the smaller half of the job and deliberately the half
   worth doing first, because it is the half that proves the idea. Adding a
   fourth horn is adding a row to a list; if that horn turns with the skull,
   grows through four stages and takes the light like the other three without a
   line of code being written for it, then the model holds and converting the
   forty-one shapes that already exist is mechanical afterwards. If it does
   not, almost nothing has been spent finding out.
   -------------------------------------------------------------------------- */
/* ---------------------------- growing up ----------------------------------
   A part is defined once and is right at every age, because its points are in
   joint units and the joints already scale. That is the default and it should
   stay the default: a horn described as "half a head-depth above the brow"
   means the same thing on a hatchling and on an adult, and nobody has to keep
   four copies of it in step.

   Two things that default cannot say, and both of them matter:

   **A stage that genuinely differs.** Not bigger — different. A juvenile's
   horn curves back where an adult's recurves forward, and no single number
   scales one into the other. `at` overrides the points for one stage and
   leaves the rest inheriting, which is the same shape `GEAR_FIT` and
   `SPECIES_STAGE` already use for exactly this problem. Overriding one field
   overrides only that field.

   **A part that is not there at some ages.** The house rule is that growing up
   changes what an animal *has*, not only how big it is. `stages` is that: a
   brow horn that arrives at subadult is `stages:[2,3]`, a juvenile's coat of
   fuzz that goes away is `stages:[0,1]`. Absent means every age, which is what
   almost everything wants.

   It is a list rather than a from/to range because the editor shows it as four
   buttons you switch on and off, and a control should store what it looks
   like. A range would also quietly forbid the animal that has a thing, loses
   it, and grows it back — which is not hypothetical for display structures.

   So inheritance is kept, per-stage escape exists, and features can arrive and
   leave — without four copies of anything that did not need them. */
function rigForStage(part, stage){
  const over = part.at && part.at[STAGE[stage] && STAGE[stage].key];
  return over ? Object.assign({}, part, over) : part;
}
function rigShows(part, stage){
  return !part.off && (!part.stages || part.stages.indexOf(stage) >= 0);
}

function drawRigParts(M, spId, joints, P){
  if (!joints) return;
  const parts = RIG_PARTS[spId];
  if (!parts) return;
  for (const part of parts){
    if (!rigShows(part, P.stage)) continue;
    rigPart(M, joints, rigForStage(part, P.stage));
  }
}

/* Where a part's points land on the finished sprite, for the editor to hang
   handles on. It runs the same arithmetic the bake does, from the same joints,
   so a handle cannot end up somewhere the pixel is not. */
function rigOutline(joints, part){
  return part.v.map(v => rigAt(joints, v));
}
