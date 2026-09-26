import { describe, it, expect } from 'vitest'
import { newGame, stepGame, W, H } from '@/lib/panel'

/**
 * The game on the robot's screen is a real game, so its rules are worth
 * testing. If the ball can leak through the paddle or the score can advance
 * without a hit, the demo is a lie in the same way a fake video would be.
 */
describe('the on-screen game', () => {
  it('starts in play, centred, with nothing scored', () => {
    const g = newGame()
    expect(g.over).toBe(false)
    expect(g.score).toBe(0)
    expect(g.paddle).toBe(W / 2)
  })

  it('bounces off the side walls rather than leaving the panel', () => {
    const g = newGame()
    g.ball = { x: W - 9, y: 100, vx: 4, vy: 0 }
    stepGame(g)
    expect(g.ball.vx).toBeLessThan(0)
    for (let i = 0; i < 400; i++) {
      stepGame(g)
      expect(g.ball.x).toBeGreaterThan(0)
      expect(g.ball.x).toBeLessThan(W)
    }
  })

  it('scores only when the paddle is actually under the ball', () => {
    const miss = newGame()
    miss.paddle = 40
    miss.ball = { x: 280, y: H - 46, vx: 0, vy: 3 }
    stepGame(miss)
    expect(miss.score).toBe(0)

    const hit = newGame()
    hit.paddle = 160
    hit.ball = { x: 160, y: H - 44, vx: 0, vy: 3 }
    stepGame(hit)
    expect(hit.score).toBe(1)
    expect(hit.ball.vy).toBeLessThan(0)
  })

  it('ends when the ball is missed, and stays ended', () => {
    const g = newGame()
    g.paddle = 20
    g.ball = { x: 300, y: H - 2, vx: 0, vy: 6 }
    stepGame(g)
    expect(g.over).toBe(true)
    const frozen = { ...g.ball }
    stepGame(g)
    expect(g.ball).toEqual(frozen)
  })

  it('puts spin on the ball when it lands off-centre, so rallies diverge', () => {
    const g = newGame()
    g.paddle = 160
    g.ball = { x: 188, y: H - 44, vx: 0, vy: 3 }
    stepGame(g)
    expect(g.ball.vx).toBeGreaterThan(0)
  })
})
