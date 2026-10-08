import StructuredData from '@/components/StructuredData'
import BuyBar from '@/components/BuyBar'
import { MotionRoot } from '@/components/site/motion'
import SiteNav from '@/components/site/SiteNav'
import Hero from '@/components/site/Hero'
import Meet from '@/components/site/Meet'
import Personality from '@/components/site/Personality'
import Talk from '@/components/site/Talk'
import Why from '@/components/site/Why'
import Colours from '@/components/site/Colours'
import Stories from '@/components/site/Stories'
import Inside from '@/components/site/Inside'
import Buy from '@/components/site/Buy'
import Faq from '@/components/site/Faq'
import Footer from '@/components/site/Footer'
import { visibleProof } from '@/lib/proof'

/**
 * One page, told as a story, one idea per section:
 *
 *   what it is like to have one  →  hero
 *   what it is                   →  meet
 *   how it behaves               →  personality
 *   what it does for you         →  talk to it
 *   why this and not a gadget    →  why
 *   which one is yours           →  colours
 *   who already has one          →  stories (real content only, in production)
 *   is it well made              →  what's inside
 *   how to get one               →  buy, order
 *   anything else                →  questions
 *
 * Specs and part numbers never lead. They are in the buy section, folded,
 * for the people who want them.
 */
export default function Page() {
  const proof = visibleProof()

  return (
    <MotionRoot>
      <StructuredData />
      <SiteNav stories={proof.hasStories} />

      <main id="top">
        <Hero />
        <Meet />
        <Personality />
        <Talk />
        <Why />
        <Colours />
        <Stories proof={proof} />
        <Inside />
        <Buy />
        <Faq />
      </main>

      <Footer socials={proof.socials} />
      <BuyBar />
    </MotionRoot>
  )
}
