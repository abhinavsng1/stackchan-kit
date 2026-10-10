# What PebbleRobo does — the list the site is written from

Confirmed by the team, October 2026. The homepage may only present these as
available. Anything else is a future feature and stays off the page until it
ships.

| Capability | What the product does | Where the site shows it |
|---|---|---|
| Facial expressions | Happy, sad, angry and other animated expressions | Demo → Faces; hero tap |
| Eye movements | Looks around, glances, changes gaze direction | Demo → Meet; hero |
| AI conversation | An AI agent for conversational interactions (over Wi-Fi) | Demo → Talk, Learn (scripted, labelled as illustrations) |
| Voice interaction | Dual microphones and a speaker for voice applications | Explore → parts |
| Head movement | Two servos: horizontal rotation and vertical movement | Demo → Move; every live robot |
| Touch interaction | Touch display and three-zone body touch | Demo → Touch |
| Camera | Video viewing and programmable vision features | Demo → Phone (video viewing); Explore → parts |
| Mobile control | Companion app: remote avatar control and video viewing | Demo → Phone (a simulated panel, labelled) |
| Remote control | ESP-NOW wireless remote control | Owning one → 04 |
| Customisation | Custom faces, firmware and applications | Demo → Make it yours (preview, labelled) |
| Connectivity | Wi-Fi, Bluetooth LE and NFC hardware | Explore → parts; Owning one |
| OTA updates | Firmware updates over the air | Owning one → 02 |

## Real, but not shipping yet — not on the page

- Answering questions about a photo it takes (vision Q&A)
- A wake word heard on the robot
- Games, such as rock-paper-scissors

`e2e/demo.spec.ts` fails if the page claims any of these.

## Awaiting confirmation

- How conversation is set up for a buyer: whether an AI service, account or
  key is needed, and who pays for it. The FAQ answers this generally and
  points to support until it is confirmed.
