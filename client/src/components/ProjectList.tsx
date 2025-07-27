import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/ProjectCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Plus, LogIn } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ProjectWithDetails } from '@shared/schema';

interface ProjectListProps {
  projects: ProjectWithDetails[];
  isLoading: boolean;
  selectedCategory?: number;
  showLoadMoreButton: boolean;
  showNoMoreMessage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isAuthenticated?: boolean;
  emptyStateConfig?: {
    title: string;
    description: string;
    showCreateButton?: boolean;
    createButtonText?: string;
    createButtonAction?: () => void;
  };
  adFrequency?: number; // Show ad every N projects
}

const DEFAULT_EMPTY_STATE = {
  title: "프로젝트가 없습니다",
  description: "아직 등록된 프로젝트가 없습니다.",
  showCreateButton: false,
  createButtonText: "프로젝트 등록하기"
};

export function ProjectList({
  projects,
  isLoading,
  selectedCategory,
  showLoadMoreButton,
  showNoMoreMessage,
  isLoadingMore,
  onLoadMore,
  isAuthenticated = false,
  emptyStateConfig = DEFAULT_EMPTY_STATE,
  adFrequency = 3
}: ProjectListProps) {
  const [, setLocation] = useLocation();
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3">
                <Skeleton className="w-full h-48 md:h-full" />
              </div>
              <div className="md:w-2/3 p-6">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (!projects || projects.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CardContent>
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold mb-2">{emptyStateConfig.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {selectedCategory 
              ? '이 카테고리에는 아직 프로젝트가 없습니다.' 
              : emptyStateConfig.description
            }
          </p>
          {emptyStateConfig.showCreateButton && (
            <div>
              {isAuthenticated ? (
                // Show create button for authenticated users
                emptyStateConfig.createButtonAction ? (
                  <Button 
                    className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90"
                    onClick={emptyStateConfig.createButtonAction}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {emptyStateConfig.createButtonText}
                  </Button>
                ) : (
                  <Link href="/create">
                    <Button className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90">
                      <Plus className="w-4 h-4 mr-2" />
                      {emptyStateConfig.createButtonText}
                    </Button>
                  </Link>
                )
              ) : (
                // Show login button for non-authenticated users
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  onClick={() => setLocation('/auth')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인하고 프로젝트 등록하기
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Project list with ads
  return (
    <div className="space-y-6">
      {projects.map((project, index) => (
        <div key={project.id}>
          <ProjectCard project={project} rank={index + 1} />
          
          {/* Ad Card every N projects */}
          {(index + 1) % adFrequency === 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600 mt-6">
              <CardContent className="p-6 text-center">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">Sponsored</div>
                <div className="bg-white dark:bg-slate-700 rounded-lg p-8">
                  <div className="text-3xl mb-4">📢</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Google Advertisement</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
      
      <LoadMoreButton
        onLoadMore={onLoadMore}
        isLoading={isLoadingMore}
        show={showLoadMoreButton}
        showNoMoreMessage={showNoMoreMessage}
      />
    </div>
  );
}