import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { ProjectList } from '@/components/ProjectList';
import { useProjectPagination } from '@/hooks/useProjectPagination';
import { useAuth } from '@/hooks/useAuth';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-violet-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 py-12 transition-colors duration-300">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Shapes */}
          <div className="absolute top-10 left-10 w-24 h-24 bg-primary/10 rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-16 w-16 h-16 bg-violet-500/10 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-24 left-20 w-20 h-20 bg-blue-500/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 right-24 w-12 h-12 bg-orange-500/10 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-green-500/10 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-1/3 right-1/3 w-14 h-14 bg-pink-500/10 rounded-full animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '5s' }}></div>
          
          {/* Large Gradient Orbs */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-gradient-to-r from-blue-500/20 to-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-20 right-1/4 w-32 h-32 bg-gradient-to-r from-violet-500/15 to-pink-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          
          {/* Geometric Shapes */}
          <div className="absolute top-1/4 left-1/6 w-8 h-8 border-2 border-primary/20 rotate-45 animate-spin" style={{ animationDuration: '12s' }}></div>
          <div className="absolute top-2/3 right-1/5 w-6 h-6 border-2 border-violet-500/20 rotate-12 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
          <div className="absolute bottom-1/3 left-1/3 w-10 h-10 border-2 border-blue-500/20 rotate-0 animate-spin" style={{ animationDuration: '8s' }}></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div className="grid grid-cols-12 gap-2 h-full w-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-gray-400 dark:border-gray-600"></div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Icon Header */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary via-violet-500 to-blue-500 rounded-3xl mb-6 shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 11.172V5l-1-1z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              AI 시대의 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">개인 프로젝트</span>를 세상에
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              혁신적인 아이디어와 창작물을 더 많은 사람들과 공유하고, 새로운 기회를 발견하세요
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg"
                className="shadow-lg hover:shadow-xl transition-shadow duration-300"
                onClick={() => setLocation('/auth')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                지금 시작하기
              </Button>
              <Button variant="outline" size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300" asChild>
                <Link href="/projects">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  프로젝트 둘러보기
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-6 bg-white/70 dark:bg-slate-800/70 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 dark:border-slate-700/50">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-lg mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-xl md:text-2xl font-bold text-primary mb-1">
                {(stats as any)?.totalProjects?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">프로젝트</div>
            </div>
            
            <div className="text-center p-6 bg-white/70 dark:bg-slate-800/70 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 dark:border-slate-700/50">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-violet-500 to-violet-400 rounded-lg mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="text-xl md:text-2xl font-bold text-violet-600 mb-1">
                {(stats as any)?.totalUsers?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">창작자</div>
            </div>
            
            <div className="text-center p-6 bg-white/70 dark:bg-slate-800/70 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 dark:border-slate-700/50">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-xl md:text-2xl font-bold text-orange-600 mb-1">
                {(stats as any)?.todayVisits?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">오늘 방문자</div>
            </div>
            
            <div className="text-center p-6 bg-white/70 dark:bg-slate-800/70 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 dark:border-slate-700/50">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-lg mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
                {(stats as any)?.todayProjects || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">오늘 등록</div>
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
                isAuthenticated={isAuthenticated}
                emptyStateConfig={{
                  title: "프로젝트가 없습니다",
                  description: "첫 번째 프로젝트를 등록해보세요!",
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