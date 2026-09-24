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
