import { AiMemoryService, MEMORY_MAX_COUNT, MEMORY_MAX_LENGTH } from './ai-memory.service';

function build(existing: { id: string; content: string }[] = []) {
  const prisma = {
    aiMemory: {
      findMany: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    chatTurnEmbedding: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const rag = { embedText: jest.fn().mockResolvedValue([0.1, 0.2]) };
  const service = new AiMemoryService(prisma as never, rag as never);
  return { service, prisma, rag };
}

describe('AiMemoryService', () => {
  it('기억은 본인 userId로 저장하고 공백을 정리한다', async () => {
    const { service, prisma } = build();
    const result = await service.remember('u1', '  영업팀   소속이라 매출  위주로 알려줘 ');
    expect(result).toMatchObject({ saved: true, content: '영업팀 소속이라 매출 위주로 알려줘' });
    expect(prisma.aiMemory.create).toHaveBeenCalledWith({
      data: { userId: 'u1', content: '영업팀 소속이라 매출 위주로 알려줘' },
    });
  });

  it('빈 값·너무 긴 값·중복·개수 초과는 저장하지 않는다', async () => {
    const { service, prisma } = build([{ id: 'm1', content: '이미 있음' }]);
    expect(await service.remember('u1', '   ')).toHaveProperty('error');
    expect(await service.remember('u1', 'a'.repeat(MEMORY_MAX_LENGTH + 1))).toHaveProperty('error');
    expect(await service.remember('u1', '이미 있음')).toMatchObject({ saved: false });

    const full = build(Array.from({ length: MEMORY_MAX_COUNT }, (_, i) => ({ id: `m${i}`, content: `c${i}` })));
    expect(await full.service.remember('u1', '새 기억')).toHaveProperty('error');
    expect(prisma.aiMemory.create).not.toHaveBeenCalled();
    expect(full.prisma.aiMemory.create).not.toHaveBeenCalled();
  });

  it('forget은 키워드가 든 기억만 본인 범위에서 지우고, 빈 키워드로는 아무것도 지우지 않는다', async () => {
    const { service, prisma } = build([
      { id: 'm1', content: '영업팀 소속' },
      { id: 'm2', content: '보고서는 표로' },
    ]);
    expect(await service.forget('u1', '')).toHaveProperty('error');
    expect(prisma.aiMemory.deleteMany).not.toHaveBeenCalled();

    const result = await service.forget('u1', '영업');
    expect(result).toMatchObject({ deleted: 1, removed: ['영업팀 소속'] });
    expect(prisma.aiMemory.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', id: { in: ['m1'] } } });
  });

  it('removeOne은 다른 사용자의 기억을 지우지 못하도록 userId 조건을 함께 건다', async () => {
    const { service, prisma } = build();
    await service.removeOne('u1', 'm9');
    expect(prisma.aiMemory.deleteMany).toHaveBeenCalledWith({ where: { id: 'm9', userId: 'u1' } });
  });

  it('recordTurn은 짧은 질문과 임베딩 실패를 조용히 건너뛴다', async () => {
    const { service, prisma, rag } = build();
    await service.recordTurn('u1', 's1', '네', []);
    expect(rag.embedText).not.toHaveBeenCalled();

    rag.embedText.mockResolvedValueOnce(null);
    await service.recordTurn('u1', 's1', '연차 며칠 남았어?', ['getLeaveBalance']);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();

    await service.recordTurn('u1', 's1', '연차 며칠 남았어?', ['getLeaveBalance']);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('searchPast는 임베딩을 못 쓰면 null을 돌려준다', async () => {
    const { service, rag } = build();
    rag.embedText.mockResolvedValueOnce(null);
    expect(await service.searchPast('u1', 's1', '연차')).toBeNull();
  });
});
