---
"rehynav": patch
---

Fix: normalize `basePath` in `stateToUrl`/`urlToState` to prevent wrong URL generation (e.g. `/apphome` instead of `/app/home`) and incorrect partial-match stripping (e.g. `/app` removed from `/application/home`)
