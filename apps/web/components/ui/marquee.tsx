import { Fragment } from "react";

/**
 * Dải chữ chạy ngang vô tận. Nội dung được lặp hai lần và dải dịch đúng một nửa chiều rộng
 * mỗi vòng nên điểm nối không bị giật. Bản lặp ẩn khỏi trình đọc màn hình.
 */
export function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <Fragment key={item}>
          <li className="font-display px-6 text-2xl font-bold whitespace-nowrap sm:text-3xl">
            {item}
          </li>
          <li aria-hidden="true" className="text-2xl">
            ✺
          </li>
        </Fragment>
      ))}
    </ul>
  );

  return (
    <div className="marquee overflow-hidden">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
