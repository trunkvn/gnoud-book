// Database dành riêng cho e2e test – tách khỏi database dev (gnoud_book).
export const DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ??
  'postgresql://gnoud@localhost:5432/gnoud_book_test';
