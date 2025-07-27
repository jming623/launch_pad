import { Button } from '@/components/ui/button';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  show: boolean;
  showNoMoreMessage: boolean;
}

export function LoadMoreButton({ 
  onLoadMore, 
  isLoading, 
  show, 
  showNoMoreMessage 
}: LoadMoreButtonProps) {
  if (!show && !showNoMoreMessage) return null;

  return (
    <div className="text-center mt-8">
      {show && (
        <Button 
          variant="outline" 
          size="lg"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? "로딩 중..." : "더 많은 프로젝트 보기"}
        </Button>
      )}
      
      {showNoMoreMessage && (
        <p className="text-gray-500 dark:text-gray-400">
          모든 프로젝트를 확인했습니다
        </p>
      )}
    </div>
  );
}