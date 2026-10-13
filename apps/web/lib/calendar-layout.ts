// Tính toán bố cục lưới lịch tuần: xếp các lịch hẹn chồng giờ cạnh nhau và đặt vị trí theo giờ.

export type LayoutItem = { id: string; startMin: number; endMin: number };
export type Placement = { lane: number; lanes: number };

/**
 * Với các lịch hẹn trong một ngày, cho biết mỗi lịch nằm ở "làn" nào và nhóm của nó có bao nhiêu làn.
 * Lịch chồng giờ được xếp cạnh nhau (mỗi cái rộng 1/lanes); lịch chỉ chạm đầu nhau không bị coi là chồng.
 * Thuật toán: sắp theo giờ bắt đầu, gom thành các "cụm" chồng nối tiếp nhau, trong cụm gán làn
 * đầu tiên còn trống.
 */
export function layoutDay(items: LayoutItem[]): Map<string, Placement> {
  const sorted = [...items].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin,
  );
  const result = new Map<string, Placement>();

  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = []; // giờ kết thúc của lịch cuối cùng trong từng làn
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = laneEnds.length;
    for (const entry of cluster) result.set(entry.id, { lane: entry.lane, lanes });
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd) flush(); // không chồng với cụm hiện tại: bắt đầu cụm mới

    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    cluster.push({ id: item.id, lane });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();

  return result;
}

/** Khoảng giờ hiển thị: mặc định 8–20 giờ, nở ra nếu có lịch hẹn nằm ngoài khoảng đó. */
export function visibleHours(
  items: { startMin: number; endMin: number }[],
  defaults = { start: 8, end: 20 },
): { start: number; end: number } {
  let start = defaults.start;
  let end = defaults.end;
  for (const item of items) {
    start = Math.min(start, Math.floor(item.startMin / 60));
    end = Math.max(end, Math.ceil(Math.min(item.endMin, 1440) / 60));
  }
  return { start: Math.max(0, start), end: Math.min(24, end) };
}

/** Vị trí (px) của một khối lịch hẹn trong cột ngày. Có chiều cao tối thiểu để vẫn bấm được. */
export function blockPosition(
  startMin: number,
  endMin: number,
  gridStartHour: number,
  pxPerHour: number,
  minHeight = 28,
): { top: number; height: number } {
  const top = ((startMin - gridStartHour * 60) / 60) * pxPerHour;
  const height = ((Math.min(endMin, 1440) - startMin) / 60) * pxPerHour - 3;
  return { top, height: Math.max(minHeight, height) };
}

/**
 * Các khoảng KHÔNG làm việc trong [fromMin, toMin) của một ngày, biết các khung giờ làm việc.
 * Dùng để tô gạch chéo trên lưới lịch cho chủ cơ sở thấy giờ nào đóng cửa.
 */
export function closedRanges(
  open: { startMin: number; endMin: number }[],
  fromMin: number,
  toMin: number,
): { startMin: number; endMin: number }[] {
  const sorted = [...open].sort((a, b) => a.startMin - b.startMin);
  const closed: { startMin: number; endMin: number }[] = [];
  let cursor = fromMin;

  for (const interval of sorted) {
    if (interval.startMin > cursor) {
      closed.push({ startMin: cursor, endMin: Math.min(interval.startMin, toMin) });
    }
    cursor = Math.max(cursor, interval.endMin);
    if (cursor >= toMin) break;
  }
  if (cursor < toMin) closed.push({ startMin: cursor, endMin: toMin });

  return closed.filter((range) => range.endMin > range.startMin);
}
