import { cn } from "@/lib/cn";

const CENTER = 200;

/** Toạ độ một điểm trên đường tròn: `angle` tính bằng độ, 0° là hướng 12 giờ, chiều kim đồng hồ. */
function polar(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

const MINUTE_TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = polar(major ? 150 : 155, i * 6);
  const b = polar(163, i * 6);
  return { major, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
});

const NUMERALS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 1;
  return { hour, ...polar(128, hour * 30) };
});

// Tia nắng: tam giác xen kẽ dài ngắn, toả ra từ mặt trời
const RAYS = Array.from({ length: 24 }, (_, i) => {
  const angle = i * 15;
  const outer = i % 2 === 0 ? 96 : 82;
  const left = polar(62, angle - 3.6);
  const right = polar(62, angle + 3.6);
  const tip = polar(outer, angle);
  return `M${left.x} ${left.y} L${tip.x} ${tip.y} L${right.x} ${right.y} Z`;
});

const DOTS = Array.from({ length: 72 }, (_, i) => polar(188, i * 5));

/**
 * Biểu tượng chính của thương hiệu: một mặt đồng hồ mặt trời. Vành ngoài (vạch phút, chữ số giờ)
 * quay chậm theo chiều kim đồng hồ, tia nắng quay ngược lại, kim giờ chỉ vào lúc "chín giờ sáng".
 * Chỉ là hình trang trí nên ẩn khỏi trình đọc màn hình.
 */
export function DialEmblem({ className }: { className?: string }) {
  const hand = polar(92, 290); // kim chỉ khoảng 9:40

  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className={cn("h-auto w-full", className)}
    >
      {/* vành chấm ngoài cùng và hai vòng viền */}
      <g className="fill-ink/45">
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.6" />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r="178" className="fill-none stroke-ink/80" strokeWidth="1.6" />
      <circle cx={CENTER} cy={CENTER} r="170" className="fill-none stroke-ink/35" strokeWidth="1" />

      {/* vành giờ: vạch phút + chữ số */}
      <g className="spin-slow">
        {MINUTE_TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            className="stroke-ink"
            strokeWidth={t.major ? 2.4 : 1}
            strokeLinecap="round"
          />
        ))}
        {NUMERALS.map((n) => (
          <text
            key={n.hour}
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-ink font-display"
            style={{ fontSize: 17, fontWeight: 700 }}
          >
            {n.hour}
          </text>
        ))}
      </g>

      {/* đĩa ngọc bích ở giữa */}
      <circle cx={CENTER} cy={CENTER} r="108" className="fill-jade stroke-hard" strokeWidth="2" />

      {/* tia nắng */}
      <g className="spin-slow-reverse">
        {RAYS.map((d, i) => (
          <path key={i} d={d} className="fill-marigold-soft" opacity={i % 2 === 0 ? 0.95 : 0.6} />
        ))}
      </g>

      {/* mặt trời */}
      <circle cx={CENTER} cy={CENTER} r="50" className="fill-marigold stroke-hard" strokeWidth="2" />
      <path
        d={`M${CENTER - 50} ${CENTER} A50 50 0 0 1 ${CENTER + 50} ${CENTER}`}
        className="fill-none stroke-hard/25"
        strokeWidth="1.5"
      />

      {/* kim đồng hồ */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={hand.x}
        y2={hand.y}
        className="stroke-hard"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx={CENTER} cy={CENTER} r="7" className="fill-paper-raised stroke-hard" strokeWidth="2.5" />
    </svg>
  );
}
