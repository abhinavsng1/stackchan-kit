import StructuredData from '@/components/StructuredData'
import BuyBar from '@/components/BuyBar'
import { MotionRoot } from '@/components/site/motion'
import SiteNav from '@/components/site/SiteNav'
import Hero from '@/components/site/Hero'
import Meet from '@/components/site/Meet'
import Showcase from '@/components/site/Showcase'
import Demo from '@/components/site/Demo'
import Explore from '@/components/site/Explore'
import Stories from '@/components/site/Stories'
import Buy from '@/components/site/Buy'
import Faq from '@/components/site/Faq'
import Footer from '@/components/site/Footer'
import { visibleProof } from '@/lib/proof'
import { magicEnabled } from '@/lib/magic'

/**
 * Stories (customer reviews) is hidden for now, everywhere: the section and
 * its link in the nav. Set this back to true to show it again; production
 * still only ever shows real entries (lib/proof.ts).
 */
const SHOW_STORIES = false

/** Product story, four films, interactive capabilities, colours and ordering. */
export default function Page() {
  const proof = visibleProof()

  return (
    <MotionRoot>
      <StructuredData />
      <SiteNav stories={SHOW_STORIES && proof.hasStories} magic={magicEnabled()} />

      {/* The order follows what visitors do. Three in four never leave the
          first screen; those who go further mostly jump straight to "what it
          does" (the most-pressed link on the page), and of those who scroll,
          half stopped inside the two-screen story that used to come next. So
          the demo comes first, then the films as proof, then the story. */}
      <main id="top">
        <Hero />
        <Demo />
        <Showcase />
        <Meet />
        <Explore />
        {SHOW_STORIES && <Stories proof={proof} />}
        <Buy magic={magicEnabled()} />
        <Faq />
      </main>

      <Footer socials={proof.socials} />
      <BuyBar magic={magicEnabled()} />
    </MotionRoot>
  )
}
