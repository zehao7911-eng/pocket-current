# POCKET CURRENT

A touch-friendly 3D water-ring toy. Tap a white pump, watch the rings rise, then let them fall over the pegs. Hold a pump for repeated pulses. Use the two tilt buttons, Q/E, or a drag across the glass to move the water sideways. Arrow keys operate the pumps and Space operates both.

Six finite authored trays progress from two to six rings, with different peg heights and a three-peg layout. There is no loss timer. A finished tray earns a star, an efficient pulse count earns another, and a quick finish earns another. The clock only records your time. Replay cleared trays and unlock Vanilla Cream and Sea Glass case finishes after two and four cleared trays.

This project contains original models, materials, textures, interface and synthesized sounds. The direct-played [Combos AQUA RING](https://combos.game/zh-CN/play/655910be0b4f459147bceb5b4280fcdc) informed the water-pump, tilt and ring-toss interaction. The simulation is a bounded buoyancy and ring-hole model with 3D rendering. It does not reproduce full fluid dynamics or the reference's online multiplayer.

index.html and standalone.html are identical self-contained entries with the locally vendored Three.js embedded. They run without a runtime CDN. index-source.html is the modular HTTP entry. The package includes the source, original SVG icon, runtime cover, build script and MIT notices. Three.js is separately licensed in vendor/THREE-LICENSE.txt.

Progress belongs to pocket-current-v1. The local checkpoint preserves ring positions, rotations, velocities, capture and stacking progress, the current tray, preferences and best results. A restored active tray opens paused. Cloud integration sends only this game's profile, with best-time minima and medal maxima.

Run node tests.mjs and node sdk-tests.mjs for the simulation and optional host regressions. Run python build.py to rebuild both inline entries and POCKET-CURRENT.zip.

Phone layouts and browser play are checked during delivery. Actual handset performance and supported GameWave App import are separate tests.
