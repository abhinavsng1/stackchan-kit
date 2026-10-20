import Image from 'next/image'

const FEATURES = [
  { image: 'assistant', version: 8, label: 'Talk naturally', title: 'Your thoughts. Good company.', body: 'Talk through an idea, ask a question, or take a break together. An AI assistant with a voice, a face, and a place on your desk.' },
  { image: 'dance', version: 8, label: 'Move to the music', title: 'Big personality. Small dance floor.', body: 'A head tilt, a happy expression, a bob to the beat. PebbleRobo makes the everyday feel more playful.' },
  { image: 'call', version: 7, label: 'Stay close', title: 'A familiar face, wherever you are.', body: 'Bring a face onto its screen through the companion app. Turn its head and check in on the space around it.' },
]
export default function Meet() {
  return <section id="why" className="section feature-story scroll-mt-16"><div className="wrap">
    <div className="feature-intro"><p className="t-label">Real robot. Real personality.</p><h2 className="t-display t-h2">A face for every<br />part of your day.</h2><p className="t-lead">It listens. It looks over. It makes you smile.<br />And it’s always up for more.</p></div>
    <div className="feature-images">{FEATURES.map((f,i)=><article className={`feature-card feature-card-${i}`} key={f.image}>
      <div className="feature-photo"><Image src={`/media/features/${f.image}-v${f.version}.webp`} fill sizes="(max-width: 760px) 94vw, (max-width: 1100px) 50vw, 850px" alt={f.image==='call'?'A seated person looking at a video caller on PebbleRobo’s screen':f.image==='dance'?'PebbleRobo tilting its head beside a phone playing music':'A woman and PebbleRobo facing each other in conversation at a home desk'} /></div>
      <div className="feature-caption"><span className="t-label">0{i+1} / {f.label}</span><h3 className="t-display t-h3">{f.title}</h3><p>{f.body}</p></div>
    </article>)}</div>
    <p className="t-mono feature-disclosure">Illustrative product scenes · Connected features use Wi-Fi and the companion app.</p>
  </div></section>
}
