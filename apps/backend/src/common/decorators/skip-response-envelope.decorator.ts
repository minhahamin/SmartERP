import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_ENVELOPE_KEY = 'skipResponseEnvelope';

/** @Sse() 같은 스트리밍 엔드포인트는 자체 응답 포맷을 가지므로 공통 success envelope을 건너뛴다 */
export const SkipResponseEnvelope = () => SetMetadata(SKIP_RESPONSE_ENVELOPE_KEY, true);
