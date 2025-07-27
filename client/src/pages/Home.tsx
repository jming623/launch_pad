import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { ProjectList } from '@/components/ProjectList';
import { useProjectPagination } from '@/hooks/useProjectPagination';

export default function Home() {
  const {
    activeTab,
    selectedCategory,
    projects,
    isLoading,
    showLoadMoreButton,
    showNoMoreMessage,
    isLoadingMore,
    setActiveTab,
    setSelectedCategory,
    handleLoadMore,
  } = useProjectPagination({ defaultTimeframe: 'today' });

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
          
          {/* Quick Stats - Hidden on mobile */}
          <div className="hidden lg:grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {(stats as any)?.totalProjects?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">프로젝트</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-violet-600">
                {(stats as any)?.totalUsers?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">창작자</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-orange-600">
                {(stats as any)?.todayVisitors?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">오늘 방문자</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-xl md:text-2xl font-bold text-green-600">
                {(stats as any)?.todayProjects || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">오늘 등록</div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:space-x-8">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:w-1/4">
            <Sidebar 
              selectedCategory={selectedCategory} 
              onCategoryChange={setSelectedCategory} 
            />
          </div>
          
          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Ranking Tabs with Category Filter */}
            <RankingTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
            
            <div className="space-y-6">
              <ProjectList
                projects={projects}
                isLoading={isLoading}
                selectedCategory={selectedCategory}
                showLoadMoreButton={showLoadMoreButton}
                showNoMoreMessage={showNoMoreMessage}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
                emptyStateConfig={{
                  title: "프로젝트가 없습니다",
                  description: "아직 등록된 프로젝트가 없습니다.",
                  showCreateButton: true,
                  createButtonText: "첫 번째 프로젝트 등록하기"
                }}
                adFrequency={3}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}