# StackChan body: CoreS3-Lite + 2× SCS0009 + Waveshare Bus Servo Adapter (A)

This body keeps the look of the official M5Stack StackChan (K151). The head shell and the base outline come from M5Stack's open-source StackChan files, and the inside is rebuilt around your parts. There are 7 printed parts, with no gears and no bearings.

**Range of motion:** tilt from 0° (level) to 90° (straight up), and pan ±90°. The CAD model is collision-free from −1° to 91° of tilt and across ±95° of pan.

![comparison](images/compare_official.png)

## Files

All the STLs are already rotated for printing. Import them as they are and don't rotate them.

| File | Part | On the bed | Supports |
|---|---|---|---|
| 01_head.stl | Head shell | front face down | none |
| 02_neck.stl | Neck (holds both servos) | upright | **build plate only**, needed under the cable groove on the underside |
| 03_neck_cover.stl | Neck cover | plate down | none |
| 04_horn_plate.stl | Horn plate (tilt-servo side) | outer face down | none |
| 05_pivot_plate.stl | Pivot plate with pin | outer face down | none |
| 06_base.stl | Base | top face down | none |
| 07_bottom_cover.stl | Bottom cover (carries the adapter board) | flat | none |
| 00_assembled_preview_NOT_FOR_PRINT.stl | All parts assembled | for viewing only | – |

## Print settings

- Material and slicer: PLA or PETG, 0.4 mm nozzle, 0.2 mm layers (0.12–0.16 mm on the head for a smoother finish), 3 walls, 20 % infill, 100 % scale.
- Print parts 04 and 05 at **100 % infill**, because they carry the head.
- Turn on elephant-foot compensation (about 0.15 mm), because the head front and the base top print on the bed.
- The fits assume a calibrated printer: 0.15 mm clearance per side around the servos and 0.3 mm crush ribs in the head pockets. **Print 02 first** and check that both servos drop in.

## Hardware

| Qty | Item | Used for |
|---|---|---|
| 2 | M3×18 socket-head screw (M3×16 also works) | Lite, top corners |
| 2 | M3×14 socket-head screw (M3×12 also works) | Lite, bottom corners. Longer screws can bottom out in the Lite. |
| 2 | M2×6 screw, head no taller than 2 mm (socket or pan head) | pan and tilt horns. The stock M2×4 is too short, and an M2×8 can bottom out in the servo shaft. |
| 2 | M2×6 self-tapping screw | neck cover |
| 2 | SCS0009 20T cross horn | pan and tilt |
| 1 | Right-angle USB-C plug with power wires (pigtail) | powers the Lite |
| 1 | Grove cable with one end cut off | Lite Port A to the adapter UART |
| opt. | 470–1000 µF ≥10 V capacitor, 1 small zip tie | servo supply buffer, strain relief |

Tools: a 2.5 mm hex key or driver that reaches at least 45 mm (for the Lite screws, through the open back of the head), and a small M2 screwdriver.

## Assembly

![exploded](images/exploded_view.png)

**Neck**

1. Centre both servos at position 512 before fitting any horns.
2. Drop the **pan servo** into the neck from the top. The shaft points down through the floor and the cable end faces the front. Its ears rest on the two ledges.
3. Lay the **tilt servo** in the top of the neck with its ears in the vertical slots, the shaft toward the speaker side and the cable end toward the front.
4. Run both servo cables down the open front bay and out through the hole in the neck floor (front, USB side).
5. Fit the **neck cover (03)**. Its tall block slides down the rear slot and holds the pan servo's back ear. Fix it with 2 self-tapping screws.
6. Push the **pivot plate (05)** pin into the round hole on the USB side of the neck. The pin turns freely there.
7. Press a cross horn onto the tilt servo so the arms make an **×**, not a +. Put the **horn plate (04)** over it and drive an M2×6 through the plate into the servo shaft.

**Head**

8. Remove the Lite's 4 back screws but leave its back cover on. Place the Lite on the head front with its USB-C/Grove side on the side that has the notch. Working through the open back, screw it on with M3×18 at the top and M3×14 at the bottom.
9. Plug the right-angle USB-C and the Grove cable into the Lite's side ports, and pass both cables through the notch at the head's front edge.

**Head onto neck**

10. Feed the Lite cables into the window on the USB side of the neck and down the front bay alongside the servo cables. Leave about 2 cm of slack between the notch and the window so the head can tilt.
11. Hold the head level in front of the neck and slide it **straight back** until both plates hit the stops in their pockets. It's a firm press fit with no screws. To take the head off, pull it straight forward.

**Base**

12. Drop the second cross horn into the recess on top of the base. It only fits as an ×.
13. Pull all 4 cables through the curved slot in the base top. Set the neck on the base with the head facing front so the pan-servo shaft engages the horn. Then drive an M2×6 **from underneath** into the servo shaft.
14. Wire the adapter as described below. Place it on the 4 pins of the bottom cover with the servo sockets toward the front and the power terminal toward the back notch, then snap the cover into the base.

## Wiring

Keep the electrical setup you already have working; this body only changes how the cables run.

- **Power:** bring a 5 V, ≥2 A lead through the notch at the back of the base into the adapter's screw terminal. A zip tie around the lead inside the base keeps it from being pulled out. The servos are rated 4–7.4 V, and a 5 V supply lets the Lite share it.
- **Lite power:** splice the USB-C pigtail's 5 V and GND onto the same terminal (a star connection) and put the capacitor across it. To flash the Lite, unplug the pigtail and plug in a data cable.
- **Signal:** connect Grove Port A to the adapter's UART: Lite TX to RX, RX to TX, and GND to GND. Leave the Grove 5 V wire unconnected. Set the mode jumper to UART, as in your current setup.
- The UART header sits only about 1.5 mm below the base's top plate. **Solder the wires to the pins** or use a right-angle header, because a Dupont housing won't fit.
- **Servos:** either socket works, since they share a bus. Pan is ID 1 and tilt is ID 2.

## Firmware

- Limit **tilt to 0–90°** (0 = looking straight ahead) and **pan to −90…+90°**. Don't allow more pan, because the cables pass through the pan joint.
- M5Stack's official StackChan firmware (`hal_servo.cpp`) already uses ID 1 for yaw and ID 2 for pitch. Its pitch limit (`30…870` = 3–87°) works as it is. Change the yaw `angleLimit` from `-1280…1280` to **`-900…900`** and redo the zero-position calibration. That firmware drives the bus on G6/G7, so with Port A you would change it to G1/G2.
- The SCS0009 has 1024 steps over 300°: 3.41 steps per degree, so 90° ≈ 307 steps.
- The 20-tooth spline moves in 18° steps, so after assembly the head can sit up to 9° off level or centre. Correct this with the zero offset instead of re-seating the horn.
- On the first run, move slowly to 90° tilt and to ±90° pan, and check that nothing rubs.

![range](images/range_of_motion.png)

## Differences from the official K151

- **Head:** the outside is unchanged (official shape, LEGO holes and slots). The inside is reworked for the Lite screws, the two plate pockets and a cable notch. The light-bar slots stay open because there's no LED board.
- **Neck:** a new part holds both SCS0009s. It replaces the official ServoBody, ServoCover, ServoSideCover, ServoArm and BearingFixture.
- **Base:** it keeps the official outline but is 18.4 mm tall instead of 11.1 mm so the adapter fits inside. The robot is 78.7 mm tall instead of 68.9 mm, and the visible neck gap is about 6 mm instead of about 4.6 mm.
- **Pan** is ±90° instead of the official firmware's ±128°. **Tilt** is 0–90° (the official firmware uses 3–87°).
- There are 7 printed parts instead of 10.

## What was checked in CAD (these parts have not been test-printed yet)

- Every STL is watertight and manifold, and each is a single body.
- There are no collisions over −1…91° of tilt or ±95° of pan (checked at tilt 0/45/90), using models of the servos, the Lite and the adapter board.
- The insertion paths work for both servos, the neck cover, both plates and the head slide-on.
- The Lite screw lengths and hex-key access were checked against the CoreS3-Lite model.

## Credits and license

- The head shell and base outline are derived from M5Stack's StackChan (K151) structure files, © 2021 M5Stack, MIT License (github.com/m5stack/M5_Hardware).
- The cross-horn recess shape is derived from the Stack-chan SCS0009 v0 case (github.com/stack-chan/stack-chan, Apache License 2.0).
- See LICENSE-THIRD-PARTY.txt.
