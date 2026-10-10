import StructuredData from '@/components/StructuredData'
import BuyBar from '@/components/BuyBar'
import { MotionRoot } from '@/components/site/motion'
import SiteNav from '@/components/site/SiteNav'
import Hero from '@/components/site/Hero'
import Meet from '@/components/site/Meet'
import Demo from '@/components/site/Demo'
import Everyday from '@/components/site/Everyday'
import Explore from '@/components/site/Explore'
import Stories from '@/components/site/Stories'
import Buy from '@/components/site/Buy'
import Faq from '@/components/site/Faq'
import Footer from '@/components/site/Footer'
import { visibleProof } from '@/lib/proof'

/**
 * Stories (customer reviews) is hidden for now, everywhere: the section and
 * its link in the nav. Set this back to true to show it again; production
 * still only ever shows real entries (lib/proof.ts).
 */
const SHOW_STORIES = false

/**
 * One page, told as a story, one question per section:
 *
 *   what is it?                     →  hero: AI, with a face
 *   why does it feel different?     →  why it feels alive
 *   what does it actually do?       →  the live demo, on the robot
 *   where does it fit in my day?    →  a day with it
 *   what does it look like?         →  explore: spin it, pick a colour
 *   who already has one?            →  stories (real content only, in production)
 *   how do I get one?               →  buy, order — price and terms said once
 *   what else?                      →  questions
 *
 * Specs and part numbers never lead. They are in the buy section, folded,
 * for the people who want them.
 */
export default function Page() {
  const proof = visibleProof()

  return (
    <MotionRoot>
      <StructuredData />
      <SiteNav stories={SHOW_STORIES && proof.hasStories} />

      <main id="top">
        <Hero />
        <Meet />
        <Demo />
        <Everyday />
        <Explore />
        {SHOW_STORIES && <Stories proof={proof} />}
        <Buy />
        <Faq />
      </main>

      <Footer socials={proof.socials} />
      <BuyBar />
    </MotionRoot>
  )
}
