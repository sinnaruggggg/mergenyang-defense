# Approved workshop scene

The scene uses the selected concept at 941×1672 source pixels. `placement.json` specifies each extracted PNG's source coordinates and ground/depth anchor. Fixed furniture is drawn with one uniform scale, so its camera and perspective stay locked to the approved image.

`background.png` retains original visible architecture. Occluded areas beneath the extracted masks use the clean reconstructed fill. `reassembled.png` is an actual composite of background, extracted PNGs and the source edge restoration layer; its decoded pixels match the approved source (0 mismatches). `reference-edge.png` is used only to validate the original still image, never while cats move.

Furniture is separated into five PNG groups; three roaming character PNGs are traced directly from the approved artwork. The blacksmith and sleeping cats remain within their fixed furniture groups. This is not a complete separation of every individual bottle, tool or static cat.

The live game uses depth sorting, navigation obstacles and perspective-dependent scale. Current movement is translation with a two-step vertical offset; it is not a newly drawn two-frame leg walk cycle. Traced sprite edges can still need a small final cleanup; the distant scout's source resolution limits its sharpness when enlarged.

Checks: `game/dev/approved-validation.json`, `game/dev/grounded-validation.json`. Screenshots: `game/dev/workshop-approved.png`, `workshop-approved-front.png`, `workshop-approved-behind.png`.
