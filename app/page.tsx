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
      <SiteNav stories={SHOW_STORIES && proof.hasStories} />

      <main id="top">
        <Hero />
        <Meet />
        <Showcase />
        <Demo />
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
