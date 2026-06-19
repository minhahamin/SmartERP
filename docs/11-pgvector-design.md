# 11. pgvector 설계

## 11.1 확장(Extension) 설치

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

AWS EC2에 직접 구축한 PostgreSQL(16.x) 또는 RDS for PostgreSQL 모두 `pgvector` 확장을 지원한다(RDS는 16.1+에서 기본 제공). Prisma Migrate가 생성하는 SQL에는 확장 생성문이 포함되지 않으므로, 최초 마이그레이션 파일에 위 문장을 수동으로 추가한다.

## 11.2 테이블 구조

```sql
CREATE TABLE document_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    token_count  INT NOT NULL,
    embedding    VECTOR(1536) NOT NULL,   -- text-embedding-3-small 차원
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks (document_id);
```

- `embedding`은 고정 차원(1536)을 명시해 잘못된 차원의 벡터가 삽입되는 것을 DB 레벨에서 방지한다.
- 멀티테넌시 격리를 위해 검색 시 항상 `documents` 테이블과 JOIN하여 `company_id`로 필터링한다(`document_chunks` 자체에는 `company_id`를 중복 저장하지 않아 정규화를 유지하되, 대규모 환경에서는 조인 비용 절감을 위해 `company_id`를 비정규화 컬럼으로 추가할 수 있다).

## 11.3 Embedding 저장 방식

- 1536차원 `float` 배열을 pgvector 리터럴 포맷(`[0.0123, -0.0456, ...]`)으로 직렬화하여 `::vector` 캐스팅과 함께 삽입한다([10-rag-design.md](10-rag-design.md) 10.6 코드 참고).
- 거리 함수는 **Cosine Distance**(`<=>`)를 사용한다. OpenAI 임베딩은 정규화되어 있지 않으므로 Cosine이 Euclidean(`<->`)보다 의미적 유사도를 더 안정적으로 반영한다.
- 삽입 시 `INSERT ... ON CONFLICT`는 사용하지 않는다(Chunk는 항상 신규 생성이며, 문서 재업로드 시 새 버전의 Chunk를 새로 insert하고 이전 버전은 보존).

## 11.4 인덱스 전략: HNSW

```sql
CREATE INDEX idx_document_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

| 옵션 | IVFFlat | **HNSW (채택)** |
|---|---|---|
| 검색 속도 | 보통 | 빠름 |
| 인덱스 빌드 시간 | 빠름 | 느림(데이터 적을 때는 무시 가능) |
| 데이터 적을 때(<10만 행) 정확도 | `lists` 파라미터 튜닝 필요 | 기본값으로도 안정적 |
| 삽입 비용 | 낮음 | 상대적으로 높음(그래프 갱신) |

ERPilot은 회사당 문서량이 수천~수만 Chunk 수준(중소기업 ERP 특성상 문서 관리가 매우 큰 규모로 성장하지 않음)이므로 **삽입 비용보다 검색 정확도/속도가 더 중요**하다고 판단해 HNSW를 선택했다. `ef_construction=64, m=16`은 pgvector 권장 기본값으로, 인덱스 크기와 빌드 시간 대비 충분한 재현율(recall)을 제공한다.

검색 시점에는 `ef_search`(런타임 파라미터)로 정확도-속도를 조정한다.

```sql
SET hnsw.ef_search = 40; -- 기본 40, 정확도가 더 필요하면 80~100까지 상향
```

## 11.5 Similarity Search 예시 SQL

```sql
-- 질문 임베딩(:query_embedding)과 가장 유사한 문서 Chunk Top-5 검색
-- 가시성 필터(company_id, is_public/department)를 함께 적용
SELECT
    dc.id,
    dc.content,
    dc.metadata,
    d.title,
    d.category,
    1 - (dc.embedding <=> :query_embedding) AS similarity   -- cosine distance -> similarity 변환
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.company_id = :company_id
  AND d.status = 'PUBLISHED'
  AND (d.is_public = true OR d.department_id = :user_department_id)
  AND (1 - (dc.embedding <=> :query_embedding)) > 0.6        -- 유사도 임계치 미달 시 제외
ORDER BY dc.embedding <=> :query_embedding
LIMIT 5;
```

NestJS에서는 Prisma `$queryRaw`(타입 안전한 템플릿 태그)로 실행한다.

```typescript
const queryVector = `[${queryEmbedding.join(',')}]`;
const results = await prisma.$queryRaw<ChunkSearchResult[]>`
  SELECT dc.id, dc.content, dc.metadata, d.title, d.category,
         1 - (dc.embedding <=> ${queryVector}::vector) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.company_id = ${companyId}
    AND d.status = 'PUBLISHED'
    AND (d.is_public = true OR d.department_id = ${userDepartmentId})
  ORDER BY dc.embedding <=> ${queryVector}::vector
  LIMIT 5
`;
```

## 11.6 카테고리 필터와 벡터 검색의 결합 (Hybrid Filtering)

특정 카테고리("정책/규정"만 검색)가 명시된 경우, `WHERE d.category = :category`를 동일 쿼리에 추가한다. pgvector는 일반 `WHERE` 절과 함께 사용해도 HNSW 인덱스를 활용하면서 메타데이터 필터를 적용할 수 있어(Postgres Planner가 인덱스 스캔 후 필터링), 별도의 하이브리드 검색 엔진(Elasticsearch 등) 없이도 충분한 성능을 낸다 — 이는 "왜 별도 Vector DB(Pinecone 등) 대신 pgvector를 선택했는가"에 대한 핵심 근거이기도 하다(메타데이터/관계형 데이터와 벡터를 같은 트랜잭션, 같은 DB에서 일관성 있게 다룰 수 있음).

## 11.7 운영 고려사항

- **재인덱싱**: Chunk가 대량 삭제/재생성된 후에는 `VACUUM ANALYZE document_chunks;`로 통계를 갱신하여 Planner가 정확한 실행 계획을 세우도록 한다.
- **모니터링**: 검색 평균 지연시간(p95), Top-K 평균 유사도 점수를 로깅하여 임계치(0.6)가 너무 엄격해 "결과 없음"이 과도하게 발생하는지 주기적으로 점검한다.
- **차원 변경 대비**: 향후 `text-embedding-3-large`(3072차원)로 전환 시 `embedding` 컬럼과 인덱스를 새로 생성해야 하므로, 컬럼명에 차원을 박지 않고(`embedding`) 마이그레이션으로 타입만 교체할 수 있도록 설계했다.
