/** Event names, in one place, with no browser code so any component can import them. */
export const EV = {
  pageViewed: 'Page Viewed',
  sectionViewed: 'Section Viewed',
  reserveCtaClicked: 'Reserve CTA Clicked',
  reserveSubmitted: 'Reserve Submitted',
  reserveSucceeded: 'Reserve Succeeded',
  reserveDuplicate: 'Reserve Already Held',
  reserveFailed: 'Reserve Failed',
  faqOpened: 'FAQ Opened',
  specsExpanded: 'Specs Expanded',
  outboundClicked: 'Outbound Link Clicked',
} as const
