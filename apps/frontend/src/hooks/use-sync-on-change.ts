import { useState } from 'react';

/**
 * deps가 바뀐 "그 렌더"에서 state를 동기화한다.
 *
 * useEffect 안에서 setState를 호출하면 일단 낡은 값으로 한 번 그린 뒤 다시 그려 깜빡이고,
 * react-hooks/set-state-in-effect 규칙도 위반한다. React 공식 문서의 "렌더 중 state 조정"
 * 패턴(prev 값과 비교해 달라졌을 때만 setState)을 훅으로 감싼 것이다.
 *
 * - 첫 렌더에서도 한 번 실행된다(prev가 아직 없으므로).
 * - sync 안에서는 같은 컴포넌트의 state만 바꿔야 한다.
 * - deps 중 참조가 매 렌더 바뀌는 값(렌더마다 새로 만든 배열/객체)을 넣으면 무한 렌더가 된다.
 */
export function useSyncOnChange(deps: readonly unknown[], sync: () => void) {
  const [prev, setPrev] = useState<readonly unknown[] | null>(null);
  if (prev === null || deps.some((dep, index) => !Object.is(dep, prev[index]))) {
    setPrev(deps);
    sync();
  }
}
