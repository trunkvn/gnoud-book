import { describe, expect, it } from 'vitest';
import {
  blockPosition,
  closedRanges,
  layoutDay,
  visibleHours,
} from './calendar-layout';

const item = (id: string, startHour: number, endHour: number) => ({
  id,
  startMin: startHour * 60,
  endMin: endHour * 60,
});

describe('layoutDay', () => {
  it('gives a lone appointment the full width', () => {
    const layout = layoutDay([item('a', 9, 10)]);
    expect(layout.get('a')).toEqual({ lane: 0, lanes: 1 });
  });

  it('puts appointments that only touch each other in separate full-width groups', () => {
    const layout = layoutDay([item('a', 9, 10), item('b', 10, 11)]);
    expect(layout.get('a')).toEqual({ lane: 0, lanes: 1 });
    expect(layout.get('b')).toEqual({ lane: 0, lanes: 1 });
  });

  it('places overlapping appointments side by side', () => {
    const layout = layoutDay([item('a', 9, 11), item('b', 10, 12)]);
    expect(layout.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(layout.get('b')).toEqual({ lane: 1, lanes: 2 });
  });

  it('reuses a lane once it is free and keeps the group width consistent', () => {
    // a: 9-12 và b: 10-11 chồng nhau; c: 11-12 dùng lại làn của b; d tách riêng ở 13-14
    const layout = layoutDay([
      item('a', 9, 12),
      item('b', 10, 11),
      item('c', 11, 12),
      item('d', 13, 14),
    ]);
    expect(layout.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(layout.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(layout.get('c')).toEqual({ lane: 1, lanes: 2 });
    expect(layout.get('d')).toEqual({ lane: 0, lanes: 1 });
  });

  it('is independent of input order', () => {
    const forward = layoutDay([item('a', 9, 11), item('b', 10, 12)]);
    const backward = layoutDay([item('b', 10, 12), item('a', 9, 11)]);
    expect(backward.get('a')).toEqual(forward.get('a'));
    expect(backward.get('b')).toEqual(forward.get('b'));
  });

  it('handles three-way overlaps', () => {
    const layout = layoutDay([item('a', 9, 12), item('b', 9, 12), item('c', 9, 12)]);
    expect(new Set([...layout.values()].map((p) => p.lane)).size).toBe(3);
    expect([...layout.values()].every((p) => p.lanes === 3)).toBe(true);
  });

  it('returns an empty map for an empty day', () => {
    expect(layoutDay([]).size).toBe(0);
  });
});

describe('visibleHours', () => {
  it('defaults to 8:00-20:00', () => {
    expect(visibleHours([])).toEqual({ start: 8, end: 20 });
  });

  it('widens to include early and late appointments', () => {
    expect(
      visibleHours([
        { startMin: 6 * 60 + 30, endMin: 7 * 60 },
        { startMin: 21 * 60, endMin: 22 * 60 + 15 },
      ]),
    ).toEqual({ start: 6, end: 23 });
  });

  it('never goes beyond the day', () => {
    expect(visibleHours([{ startMin: 23 * 60, endMin: 26 * 60 }])).toEqual({
      start: 8,
      end: 24,
    });
  });
});

describe('blockPosition', () => {
  it('positions by minutes from the top of the grid', () => {
    // lưới bắt đầu 8:00, 60px mỗi giờ; lịch 9:30-10:30
    expect(blockPosition(9 * 60 + 30, 10 * 60 + 30, 8, 60)).toEqual({
      top: 90,
      height: 57,
    });
  });

  it('keeps very short appointments clickable', () => {
    expect(blockPosition(9 * 60, 9 * 60 + 5, 8, 60).height).toBe(28);
  });
});

describe('closedRanges', () => {
  const hour = (h: number) => h * 60;

  it('is everything when the day has no working hours', () => {
    expect(closedRanges([], hour(8), hour(20))).toEqual([
      { startMin: hour(8), endMin: hour(20) },
    ]);
  });

  it('is the gaps around and between working intervals', () => {
    const open = [
      { startMin: hour(13), endMin: hour(17) },
      { startMin: hour(9), endMin: hour(12) },
    ];
    expect(closedRanges(open, hour(8), hour(20))).toEqual([
      { startMin: hour(8), endMin: hour(9) },
      { startMin: hour(12), endMin: hour(13) },
      { startMin: hour(17), endMin: hour(20) },
    ]);
  });

  it('is empty when the working hours cover the whole visible range', () => {
    expect(
      closedRanges([{ startMin: 0, endMin: 1440 }], hour(8), hour(20)),
    ).toEqual([]);
  });

  it('clips to the visible range', () => {
    expect(
      closedRanges([{ startMin: hour(6), endMin: hour(10) }], hour(8), hour(12)),
    ).toEqual([{ startMin: hour(10), endMin: hour(12) }]);
  });
});
