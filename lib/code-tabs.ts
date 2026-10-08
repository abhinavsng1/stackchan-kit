/**
 * The code shown in the software section.
 *
 * Every line here was read out of a real file, and each tab records where.
 * This is the part of a hardware page most likely to be invented — a
 * plausible-looking API that does not exist is worse than no code at all,
 * because the one person who tries it is the one who already bought the
 * thing.
 *
 * Where a tab could not be verified against a checkout on this machine, it is
 * not here.
 */
export type CodeTab = {
  id: string
  /** The filename on the tab itself. */
  label: string
  /** Language, for the window's status line. */
  lang: string
  /** Where this came from, shown under the window. */
  source: string
  code: string
}

export const CODE_TABS: CodeTab[] = [
  {
    id: 'setup',
    label: 'setup.sh',
    lang: 'zsh',
    source: 'meganetaaan/stack-chan, project README',
    code: `# Clone it, build it, push it over USB-C.
git clone https://github.com/meganetaaan/stack-chan.git
cd stack-chan && npm i
npm run setup -- --device=esp32
npm run flash

# The face comes up and the head finds centre.`,
  },
  {
    id: 'face',
    label: 'face.cpp',
    lang: 'c++',
    source: 'firmware/main/hal/board/stackchan_display.cc',
    code: `// The six the firmware draws. An expression it does not know
// falls back to Neutral rather than failing.
avatar.setEmotion(Emotion::Neutral);
avatar.setEmotion(Emotion::Happy);
avatar.setEmotion(Emotion::Angry);
avatar.setEmotion(Emotion::Sad);
avatar.setEmotion(Emotion::Doubt);
avatar.setEmotion(Emotion::Sleepy);

// Sleepy is the one with side effects: it drops the head,
// stops the idle motion and puts up a "Zzz".`,
  },
  {
    id: 'serial',
    label: 'serial',
    lang: 'usb-c',
    source: 'firmware/main/hal/lite/lite_console.cpp',
    code: `# Plug in a cable and talk to the servos directly.
h 150            # go home at speed 150
a 300 -50 600    # yaw 30.0, pitch -5.0 degrees, at speed 600
r                # report both servos
t 1 0            # servo 1 torque off
z 1              # set servo 1 home to where it is now`,
  },
]
