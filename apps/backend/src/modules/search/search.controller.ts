import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

/** 헤더 전체 검색. `@RequirePermissions`는 적용하지 않고 인증만 요구하며, 리소스별 노출은 서비스 내부에서 판단한다. */
@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '전체 검색(제품/거래처/직원/문서/공지/생산오더/창고)' })
  search(@Query() query: SearchQueryDto, @CurrentUser() user: AuthUser) {
    return this.searchService.search(query.q, user);
  }
}
