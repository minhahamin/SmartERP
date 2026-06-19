import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';

function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <Compass className="size-6" />
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">404</p>
        <p className="mt-1 text-sm text-muted-foreground">요청하신 페이지를 찾을 수 없습니다.</p>
      </div>
      <Button asChild>
        <Link to={ROUTES.dashboard}>대시보드로 이동</Link>
      </Button>
    </div>
  );
}

export { NotFoundPage };
