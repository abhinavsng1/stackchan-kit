/** Event names, in one place, with no browser code so any component can import them. */
export const EV = {
  // ---- reach ----
  pageViewed: 'Page Viewed',
  sectionViewed: 'Section Viewed',
  scrollDepth: 'Scroll Depth',

  // ---- interest ----
  galleryViewed: 'Gallery View Chosen',
  demoPlayed: 'Demo Video Played',
  demoProgress: 'Demo Video Progress',
  faqOpened: 'FAQ Opened',
  specsExpanded: 'Specs Expanded',
  outboundClicked: 'Outbound Link Clicked',
  amazonClicked: 'Amazon Listing Opened',
  editionChosen: 'Edition Chosen',
  colourChosen: 'Colour Chosen',
  demoModeChosen: 'Demo Mode Chosen',

  /* ---- measurement only: sent with measure(), so Mixpanel sees them and
     the ad platforms never do (lib/analytics.ts) ---- */
  /** A tap on a robot. `live` says whether the 3D one was there to react. */
  robotTapped: 'Robot Tapped',
  /** Something tried in the demo: the camera (and whether it opened), the music, or an answer. */
  demoAction: 'Demo Action',
  /** A film in the deck brought to the front, and how: arrow, dot, swipe or listen. */
  filmChosen: 'Film Chosen',
  /** Visible time on the page passed 10, 30, 60 or 120 seconds. */
  pageEngaged: 'Page Engaged',
  /** How long the page took, as this visitor's device experienced it. */
  pagePerformance: 'Page Performance',
  /** A form field left with something in it. The field's name, never its value. */
  reserveFieldCompleted: 'Reserve Field Completed',

  // ---- the funnel that matters ----
  reserveCtaClicked: 'Reserve CTA Clicked',
  reserveFormStarted: 'Reserve Form Started',
  reserveFieldInvalid: 'Reserve Field Invalid',
  reserveSubmitted: 'Reserve Submitted',
  reserveSucceeded: 'Reserve Succeeded',
  reserveDuplicate: 'Reserve Already Held',
  reserveFailed: 'Reserve Failed',

  /* Payment. The order exists by this point, so a drop-off here is a very
     different problem from a drop-off in the form, and is measured apart. */
  /* How they chose to pay, and what a code did about it. Both are choices
     made before any money moves, so a drop-off after one of them says
     something different from a drop-off before it. */
  planChosen: 'Plan Chosen',
  couponApplied: 'Coupon Applied',
  couponRefused: 'Coupon Refused',

  /* The balance, settled online instead of at the door. */
  balancePageOpened: 'Balance Page Opened',
  balancePaid: 'Balance Paid Online',

  paymentOpened: 'Payment Opened',
  paymentSucceeded: 'Payment Succeeded',
  paymentDismissed: 'Payment Dismissed',
  paymentFailed: 'Payment Failed',
} as const

/**
 * The conversion funnel, in order. Mixpanel funnels are built from this, so the
 * dashboard and the code cannot disagree about what the steps are.
 */
export const FUNNEL: string[] = [
  EV.pageViewed,
  EV.sectionViewed,
  EV.reserveCtaClicked,
  EV.reserveFormStarted,
  EV.reserveSubmitted,
  EV.reserveSucceeded,
  EV.paymentSucceeded,
]
