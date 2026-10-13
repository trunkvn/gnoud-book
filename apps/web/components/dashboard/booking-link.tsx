"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

const subscribeNever = () => () => {};

/** Địa chỉ đầy đủ của trang đặt lịch (cần origin của trình duyệt nên chỉ có sau khi hydrate). */
export function useBookingUrl(slug: string): string {
  const origin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );
  return `${origin}/book/${slug}`;
}

/** Nút "Sao chép đường dẫn": chép địa chỉ trang đặt lịch vào clipboard và báo "Đã chép" trong giây lát. */
export function CopyLinkButton({
  slug,
  variant = "secondary",
  size = "md",
}: {
  slug: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const url = useBookingUrl(slug);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt từ chối clipboard (không phải HTTPS...): để người dùng tự chép từ ô địa chỉ
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy} aria-live="polite">
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      {copied ? "Đã chép" : "Sao chép đường dẫn"}
    </Button>
  );
}

/** Hai nút ở đầu trang lịch: mở trang đặt lịch của khách và sao chép đường dẫn. */
export function BookingLinkActions({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <ButtonLink href={`/book/${slug}`} target="_blank" rel="noreferrer" variant="secondary" size="sm">
        Xem trang đặt lịch
      </ButtonLink>
      <CopyLinkButton slug={slug} size="sm" />
    </div>
  );
}
