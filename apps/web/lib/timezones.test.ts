import { describe, expect, it } from 'vitest';
import { buildZoneGroups, POPULAR_ZONES } from './timezones';

const describe_ = (name: string) => name;
const values = (groups: ReturnType<typeof buildZoneGroups>) =>
  groups.flatMap((g) => g.zones.map((z) => z.value));

describe('buildZoneGroups', () => {
  // Chrome liệt kê tên cũ "Asia/Saigon", không có "Asia/Ho_Chi_Minh"
  const chromeNames = ['Africa/Abidjan', 'Asia/Saigon', 'Asia/Tokyo', 'Europe/Paris'];

  it('always contains the current timezone, even when the browser does not list it', () => {
    const groups = buildZoneGroups(chromeNames, 'Asia/Ho_Chi_Minh', describe_);
    expect(values(groups)).toContain('Asia/Ho_Chi_Minh');
  });

  it('keeps a current timezone that is not in the popular list or the browser list', () => {
    const groups = buildZoneGroups(chromeNames, 'Pacific/Fiji', describe_);
    expect(values(groups)).toContain('Pacific/Fiji');
    expect(groups[0].zones[0].value).toBe('Pacific/Fiji'); // nằm đầu để dễ thấy
  });

  it('puts popular timezones first, with Vietnam at the top', () => {
    const groups = buildZoneGroups(chromeNames, 'Asia/Ho_Chi_Minh', describe_);
    expect(groups[0].label).toBe('Phổ biến');
    expect(groups[0].zones.map((z) => z.value)).toEqual(POPULAR_ZONES);
  });

  it('never lists the same timezone twice', () => {
    const groups = buildZoneGroups(
      [...chromeNames, 'Asia/Tokyo', 'UTC'],
      'Asia/Tokyo',
      describe_,
    );
    const all = values(groups);
    expect(new Set(all).size).toBe(all.length);
  });

  it('groups the rest by region, sorted', () => {
    const groups = buildZoneGroups(chromeNames, 'Asia/Ho_Chi_Minh', describe_);
    const africa = groups.find((g) => g.label === 'Africa');
    const asia = groups.find((g) => g.label === 'Asia');
    expect(africa?.zones.map((z) => z.value)).toEqual(['Africa/Abidjan']);
    expect(asia?.zones.map((z) => z.value)).toEqual(['Asia/Saigon']);
  });

  it('uses the describe function for labels', () => {
    const groups = buildZoneGroups(['Asia/Saigon'], 'UTC', (n) => `${n} (x)`);
    expect(groups.at(-1)?.zones[0].label).toBe('Asia/Saigon (x)');
  });
});
