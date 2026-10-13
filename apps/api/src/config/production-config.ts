type Env = Record<string, string | undefined>;

const MIN_JWT_SECRET_LENGTH = 32;
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

const isLocal = (value: string) => LOCAL_HOSTS.some((h) => value.includes(h));

/**
 * Những cấu hình mà nếu sai thì server vẫn chạy được nhưng sai âm thầm: token ký bằng khoá yếu,
 * email dẫn khách về localhost, email không bao giờ ra khỏi máy chủ. Ở production ta thà không
 * khởi động còn hơn chạy sai. Ngoài production thì không kiểm tra gì để dev vẫn chạy với mặc định.
 */
export function findProductionConfigProblems(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];

  const secret = env.JWT_SECRET ?? '';
  if (secret.length < MIN_JWT_SECRET_LENGTH || secret.includes('change-me')) {
    problems.push(
      `JWT_SECRET phải là chuỗi ngẫu nhiên dài từ ${MIN_JWT_SECRET_LENGTH} ký tự và không phải giá trị mẫu (tạo bằng: openssl rand -base64 48).`,
    );
  }

  if (!env.WEB_URL || isLocal(env.WEB_URL)) {
    problems.push(
      'WEB_URL phải là địa chỉ công khai của web (vd https://book.example.com), vì email dùng nó để tạo liên kết quản lý lịch.',
    );
  }

  if (!env.SMTP_HOST || isLocal(env.SMTP_HOST)) {
    problems.push(
      'SMTP_HOST phải trỏ tới dịch vụ SMTP thật (không phải localhost), nếu không email xác nhận và nhắc lịch sẽ không bao giờ được gửi.',
    );
  }

  return problems;
}

/** Swagger liệt kê toàn bộ API, nên mặc định chỉ bật khi phát triển. */
export function swaggerEnabled(env: Env): boolean {
  return env.NODE_ENV !== 'production' || env.SWAGGER_ENABLED === 'true';
}

/**
 * Sau proxy (Vercel, Railway…) mọi request tới API đều có IP của proxy, nên rate limit sẽ coi cả
 * thế giới là một người. TRUST_PROXY cho Express biết có mấy lớp proxy để lấy đúng IP khách từ
 * X-Forwarded-For. Mặc định không tin header đó, vì client có thể tự điền để né giới hạn.
 */
export function parseTrustProxy(
  value: string | undefined,
): number | string | undefined {
  if (!value) return undefined;
  return /^\d+$/.test(value) ? Number(value) : value;
}
