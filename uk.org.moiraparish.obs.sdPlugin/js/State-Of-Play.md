# Notes where we are

- keyNewSlideBaseScene - not quite there yes as we haven't quite cleared the old camera out of the way. So what do we want in workflow here.
  - Can now select and move to preview on other cameras - but I lose the live preview camera - or maybe I don't and we can just clear out of it. Yellow remains on the original live one though - maybe should clear that - or just leave it ?
  - A full clear preview should disarm slides full stop.
  - Also - a clean transition to live should be good too.
- Confusing when Cam 1 is new pre-slides preview but doesn't actually live to Camera two and switch over the slides for it.


Going for new branch and simplifying.
Preview is actual preview as we need to position camera.

1. If Current program button is type scene
   1. Then activate preview directly.
   2. Clear slide buttons completely as they are no longer in play.
3. If we preview from active slides in live (current == type_slide) with a preview button capable of slides:
   1. Go Full preview so camera is set
   2. New function to pre-prep slides - set standby buttons as we do now to new slide.
   3. Set live slide button with new colour (orange maybe to allow for change) to be ready for next live.
   4. On next live:
      1. Current live button select - switch over to fully live on this button with new scene select. Which means lock disappears from associated camera buttons
      2. Standby slide button select - make it live but also fixup previous live button - preview button is still preview now in slide locked mode.
      3. Preview button select - then cancel all slides and revert to previous camera for that slide (can we do this).
4. If we preview from active slides in live, with a non-slide capable preview:
   1. Cancel slides except active one - keep this red tho as can't be pressed
   2. On next live:
      1. Preview button - cancel remainder slide and re-active previous live camera button as preview
      2. Block any slide actions with warning...



Question - how do we check yellow button - I guess if we are in slide territory....


New States:
Evaluate if we need these.
