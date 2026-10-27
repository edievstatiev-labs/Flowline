// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScatterChart, Scatter } from './scatter-chart';
import { AreaChart, Area } from './area-chart';
import { YAxis } from './y-axis';

const data = [
  { date: new Date('2026-07-01T08:00:00Z'), value: 8 },
  { date: new Date('2026-07-02T09:00:00Z'), value: 9 },
];

describe('Bklit charts preserve native page and drawer touch scrolling', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    // jsdom lacks layout. Chart source, SVG series, React event handling and
    // the interaction hooks remain real; only measured dimensions are supplied.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(220);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function touchMove(plot: Element) {
    const event = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: [{ clientX: 120, clientY: 100 }] });
    await act(async () => { plot.dispatchEvent(event); });
    return event;
  }

  it.each(['scatter', 'area'] as const)('%s keeps real chart output while allowing vertical panning', async (kind) => {
    await act(async () => root.render(<MotionConfig reducedMotion="always">
      {kind === 'scatter'
        ? <ScatterChart data={data} allowTouchScroll yDomain={[0, 24]} animationDuration={0}><Scatter dataKey="value" animate={false} /></ScatterChart>
        : <AreaChart data={data} allowTouchScroll animationDuration={0} yDomainTween={false}><Area dataKey="value" animate={false} /></AreaChart>}
    </MotionConfig>));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const plot = svg!.querySelector('g')!;
    expect(plot).not.toBeNull();
    expect((plot as SVGGElement).style.touchAction).toBe('pan-y');
    expect(container.querySelectorAll('circle, path').length).toBeGreaterThan(0);
    expect((await touchMove(plot)).defaultPrevented).toBe(false);
  });

  it('renders actual source-clock axis values instead of the generic 0–100 lifecycle domain', async () => {
    await act(async () => root.render(<MotionConfig reducedMotion="always">
      <ScatterChart data={data} allowTouchScroll yDomain={[0, 24]} animationDuration={0}>
        <Scatter dataKey="value" animate={false} />
        <YAxis tickValues={[0, 6, 12, 18, 24]} formatValue={value => `hour:${value}`} />
      </ScatterChart>
    </MotionConfig>));
    const labels = [...container.querySelectorAll('span')].map(node => node.textContent).filter(text => text?.startsWith('hour:'));
    expect(labels).toEqual(['hour:0', 'hour:6', 'hour:12', 'hour:18', 'hour:24']);
  });

  it('derives automatic axis ticks from the live scatter domain', async () => {
    await act(async () => root.render(<MotionConfig reducedMotion="always">
      <ScatterChart data={data} allowTouchScroll yDomain={[0, 24]} animationDuration={0}>
        <Scatter dataKey="value" animate={false} />
        <YAxis numTicks={5} formatValue={value => `hour:${value}`} />
      </ScatterChart>
    </MotionConfig>));
    const labels = [...container.querySelectorAll('span')].map(node => node.textContent).filter(text => text?.startsWith('hour:'));
    expect(labels).toEqual(['hour:0', 'hour:5', 'hour:10', 'hour:15', 'hour:20']);
  });
});
