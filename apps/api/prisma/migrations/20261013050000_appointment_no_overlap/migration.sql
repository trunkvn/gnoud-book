-- Chống đặt trùng giờ ngay ở tầng database.
-- Prisma schema không mô tả được ràng buộc loại này nên ta viết SQL thủ công.

-- btree_gist cho phép dùng toán tử "=" (so sánh bằng) cùng "&&" (chồng nhau) trong một ràng buộc.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Giờ kết thúc phải sau giờ bắt đầu.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_ends_after_starts" CHECK ("endsAt" > "startsAt");

-- Hai lịch hẹn ĐÃ XÁC NHẬN của cùng một cơ sở không được chồng thời gian.
-- tstzrange(a, b) là khoảng [a, b): hai lịch chạm đầu nhau (11:00 / 11:00) vẫn hợp lệ.
-- Lịch đã huỷ không bị ràng buộc, nên slot được trả lại cho người khác.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlap"
  EXCLUDE USING gist (
    "businessId" WITH =,
    tstzrange("startsAt", "endsAt") WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
