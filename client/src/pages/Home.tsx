import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProjectCard } from '@/components/ProjectCard';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { ProjectWithDetails } from '@shared/schema';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly' | 'all'>('today');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [allProjects, setAllProjects] = useState<ProjectWithDetails[]>([]);
  const [noMoreProjects, setNoMoreProjects] = useState(false);
  const [hasTriedLoadMore, setHasTriedLoadMore] = useState(false); // Track if user has tried loading more
  const queryClient = useQueryClient();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects', { 
      timeframe: activeTab, 
      categoryId: selectedCategory,
      page: 1,
      limit: 20 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe: activeTab,
        page: '1',
        limit: '20',
      });
      
      if (selectedCategory) {
        params.set('categoryId', selectedCategory.toString());
      }
      
      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      
      // Reset state when query changes
      setAllProjects(data);
      setCurrentPage(1);
      setNoMoreProjects(data.length < 20);
      setHasTriedLoadMore(false); // Reset the flag when new data loads
      
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1분 캐시
    gcTime: 5 * 60 * 1000, // 5분 가비지 컬렉션
  });

  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams({
        timeframe: activeTab,
        page: nextPage.toString(),
        limit: '20',
      });
      
      if (selectedCategory) {
        params.set('categoryId', selectedCategory.toString());
      }
      
      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error('Failed to fetch more projects');
      return response.json();
    },
    onSuccess: (newProjects: ProjectWithDetails[]) => {
      setHasTriedLoadMore(true); // Mark that user has tried loading more
      if (newProjects.length === 0) {
        setNoMoreProjects(true);
      } else {
        setAllProjects(prev => [...prev, ...newProjects]);
        setCurrentPage(prev => prev + 1);
        if (newProjects.length < 20) {
          setNoMoreProjects(true);
        }
      }
    },
    onError: () => {
      setHasTriedLoadMore(true); // Mark that user has tried loading more
      setNoMoreProjects(true);
    }
  });

  const handleLoadMore = () => {
    if (loadMoreMutation.isPending) return; // Prevent double clicks
    loadMoreMutation.mutate();
  };

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    staleTime: 5 * 60 * 1000, // 5분 캐시 (stats는 자주 변하지 않음)
    gcTime: 10 * 60 * 1000, // 10분 가비지 컬렉션
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-primary-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              오늘의 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">트렌딩 프로젝트</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              창작자들의 최신 프로젝트를 발견하고, 새로운 아이디어에 영감을 받아보세요
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {(stats as any)?.totalProjects?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">프로젝트</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {(stats as any)?.totalUsers?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">사용자</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {(stats as any)?.todayVisits?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">일일 방문자</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {(stats as any)?.totalLikes?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">좋아요</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 mb-8 lg:mb-0">
            <Sidebar 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Ranking Tabs */}
            <div className="mb-6">
              <RankingTabs 
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            
            {/* Project Grid */}
            <div className="space-y-6">
              {projectsLoading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="md:flex">
                        <div className="md:w-1/3">
                          <Skeleton className="w-full h-48 md:h-full" />
                        </div>
                        <div className="md:w-2/3 p-6">
                          <Skeleton className="h-6 w-24 mb-2" />
                          <Skeleton className="h-6 w-full mb-2" />
                          <Skeleton className="h-4 w-full mb-3" />
                          <div className="flex space-x-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : allProjects && allProjects.length > 0 ? (
                <>
                  {allProjects.map((project: ProjectWithDetails, index: number) => (
                    <div key={project.id}>
                      <ProjectCard project={project} rank={index + 1} />
                      
                      {/* Ad Card every 3rd project */}
                      {(index + 1) % 3 === 0 && (
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
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-lg font-semibold mb-2">프로젝트가 없습니다</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {selectedCategory 
                        ? '이 카테고리에는 아직 프로젝트가 없습니다.' 
                        : '아직 등록된 프로젝트가 없습니다. 첫 번째 프로젝트를 등록해보세요!'
                      }
                    </p>
                    <Button asChild>
                      <a href="/create">프로젝트 등록하기</a>
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Load More Button */}
              {allProjects && allProjects.length > 0 && !projectsLoading && (
                <div className="text-center mt-8">
                  {noMoreProjects && hasTriedLoadMore && !loadMoreMutation.isPending && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      더 이상 로드할 프로젝트가 없습니다.
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={loadMoreMutation.isPending}
                  >
                    {loadMoreMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '더 많은 프로젝트 보기'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
