# The editor needs a ground-up redesign

**Owner's verdict, end of session 15, on the work in this branch:**

> "still have a lot of feedback… im not happy with it. this whole designer
> realistically needs a complete redesign."

And earlier in the same session, on the same tool:

> "it all feels so extremely clunky and not right… the project has become a
> serious mess"

> "i dont get what the hell is going on there are a million dropdowns and
> points"

This document exists so the next session does not start by iterating on the
Rig tab again. It should not be iterated on. It should be replaced, and the
brief for the replacement does not exist yet.

---

## What was tried, and why it did not land

The Rig tab was rewritten once already inside this session, in direct response
to the "million dropdowns" complaint. Three dropdowns for adding a part became
three buttons and a click on the animal; a fourth dropdown for choosing which
bone a point hangs on became automatic attachment to the nearest one; eighteen
permanent joint dots became bones that appear only while something is being
moved; four width sliders became one thickness and one taper.

That rewrite is real and it is in this branch. **It was still not right.** The
lesson to carry forward is that the problem was never the count of dropdowns —
that was a symptom the owner reported accurately and I fixed literally. Making
the same tool tidier does not make it the right tool.

## The diagnosis I can actually defend

Measured, at the end of this session:

| | |
|---|---|
| Tabs in the editor | **10** |
| `tools/edit-ui.js` | **1,992 lines** |
| Editor total | **2,676 lines** |
| Distinct controls constructed | **62** |

Ten tabs: `pix, species, body, draw, rig, stages, coats, gear, habitat,
backdrop`.

**Six of those ten edit the same thing — what an animal looks like — in six
unrelated ways.** Species is sliders over proportions. Body is drag handles
that write those same proportions. Growth is the per-stage multipliers behind
both. Coats is the colour ramps. Draw is per-material pixel grids. Rig is parts
on bones. A person who wants a different Triceratops has to know which of six
tabs owns the change they have in mind, and nothing on screen tells them.

That is the mess. It is not a UI problem that a better Rig tab could fix; it is
the editor having grown one tab per feature over several sessions, each one
correct on its own terms, with no moment where anyone asked what the whole
thing is supposed to be. This session added two more tabs (Draw, Rig) and made
it worse, not better.

## What is not yet known

**The owner's detailed feedback has not been given yet** — only the verdict.
Nothing in this document should be read as a redesign brief. Specifically
unknown:

- Which parts of the current editor are worth keeping at all
- Whether the ten tabs should collapse into one surface, a few, or a different
  shape entirely
- Whether the Rig model itself is right and only its presentation is wrong, or
  whether the model is also wrong
- What the owner actually wants the act of "changing how a dinosaur looks" to
  feel like, start to finish

**Get that first.** The single most expensive mistake available to the next
session is to start building a replacement from this document alone, because
this document is a diagnosis written by the person who caused the problem.

## What is worth salvaging, on the evidence

Stated as evidence rather than as a plan, because the plan is not mine to make:

- **The rig model is proved and cheap.** A part is a shape, a material and
  points in a bone's units; it grows, animates and lights with nothing written
  for it. That was tested on all three species. Whatever the editor becomes,
  this is a good thing for it to sit on.
- **The growth answer is settled and simple.** One shape covers every age,
  because points are in the bone's own units; `stages` says which ages have the
  part at all, `at` overrides one age that is genuinely a different shape.
- **The per-material pixel grids (`PART_PIX`, `PART_MATS`) are the weakest
  thing here** and `docs/ARCHITECTURE-REVIEW.md` §7 already argues they should
  be removed under any road. This session's evidence supports that: `PART_PIX`
  is the largest block in `00-art.js` for six partial drawings of two animals.
- **The three species files still hold their shapes in code.** Until they do
  not, any editor is editing around the edges of the animal rather than the
  animal. See `ARCHITECTURE-REVIEW.md`, Road D.

## Everything else in this branch

Independent of the editor and, as far as is known, fine:

- The world is now 280×210 with the view pulling back as the animal grows
- Habitat backdrops can be hand-painted (`src/00-bg-art.js`)
- Species can carry their own painting colours
- All three species publish skeletons
- 31 tests, and the build is byte-reproducible

None of that is what the owner is unhappy with. The editor is.
