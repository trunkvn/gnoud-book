import type { MetadataRoute } from "next";

// Trang đặt lịch của khách cho phép tìm thấy; khu quản lý, link quản lý lịch hẹn (chứa token) và API thì không.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/book/"],
      disallow: ["/dashboard", "/manage/", "/api/", "/login", "/register"],
    },
  };
}
