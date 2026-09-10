/** 실행 환경변수 검증 — 시크릿 미설정/약한 기본값으로 부팅되는 것을 방지한다. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const get = (key: string): string | undefined => {
    const v = config[key];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  };

  const errors: string[] = [];
  const nodeEnv = get('NODE_ENV') ?? 'development';
  const isProd = nodeEnv === 'production';

  if (!get('DATABASE_URL')) errors.push('DATABASE_URL이 설정되지 않았습니다.');
  if (!get('CORS_ORIGIN')) errors.push('CORS_ORIGIN이 설정되지 않았습니다.');

  const jwtSecret = get('JWT_ACCESS_SECRET');
  if (!jwtSecret) {
    errors.push('JWT_ACCESS_SECRET이 설정되지 않았습니다.');
  } else if (jwtSecret.length < 32 || jwtSecret.includes('change-me')) {
    errors.push('JWT_ACCESS_SECRET은 32자 이상의 무작위 문자열이어야 합니다.');
  }

  // 운영에서는 AI 키 없이 부팅은 허용하되 RAG/AI 호출 시점에 명확한 에러를 내도록 한다.
  // (빌드·헬스체크와 런타임 AI 장애를 분리하기 위함)
  if (isProd && !get('GEMINI_API_KEY')) {
    // eslint-disable-next-line no-console
    console.warn('[config] GEMINI_API_KEY 미설정 — AI 요약/RAG 기능이 비활성화됩니다.');
  }

  if (errors.length > 0) {
    throw new Error(`환경변수 검증 실패:\n- ${errors.join('\n- ')}`);
  }
  return config;
}
