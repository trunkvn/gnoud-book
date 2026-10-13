"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Hộp thoại dựa trên thẻ <dialog> gốc của trình duyệt, nên có sẵn: khoá cuộn nền, bẫy phím Tab
 * trong hộp thoại, đóng bằng phím Esc, và đọc đúng bởi trình đọc màn hình. Bấm vào lớp nền mờ cũng đóng.
 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // bấm vào lớp nền mờ (chính là phần tử dialog) thì đóng
        if (event.target === ref.current) ref.current?.close();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-3xl border-2 border-hard bg-paper-raised p-0 text-ink shadow-[8px_8px_0_0_var(--hard)] backdrop:bg-ink/55"
    >
      {open && (
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2
                id={titleId}
                className="font-display mt-2 text-3xl leading-tight font-black"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Đóng"
              className="rounded-full p-2 hover:bg-ink/8"
            >
              <CloseIcon />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
