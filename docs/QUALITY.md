# Definition of done

A feature is done when its acceptance criteria pass, relevant automated checks pass, and changed interactions have been exercised. A game release additionally requires:

- A complete core loop: entry, controls/onboarding, play, result or failure, restart, and exit/navigation.
- Keyboard focus visibility; usable supported input modes; readable text/contrast; no essential color-only signals.
- Audio starts only after user interaction, with accessible mute/volume controls. Pause/focus-loss behavior is intentional.
- Save format versioning, reset behavior, and reload/migration tests if persistence exists. No silent save loss.
- Supported desktop/mobile browsers and device constraints explicitly listed in DESIGN.md. No assumed touch support.
- A measured frame-time/load-size budget on target hardware, recorded with the release. Agree numbers per game, not by guesswork.
- No uncaught errors, broken production-path assets, progression blockers, or known data-loss defects.
- All asset sources, licenses, modifications, and attribution obligations recorded.
- Manual playtest evidence, known issues, and player-facing release notes.
- Live deployment verified; rollback commit identified.

The studio smoke suite verifies homepage rendering, catalog behavior, navigation, keyboard skip link, and layout at desktop/mobile sizes. It does not certify game fun, screen-reader usability, performance, Safari/Firefox compatibility, or every input device. Expand coverage with actual game requirements.
