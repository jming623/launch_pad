import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { ProjectList } from '@/components/ProjectList';
import { Button } from '@/components/ui/button';
import { useProjectPagination } from '@/hooks/useProjectPagination';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function Projects() {
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
  } = useProjectPagination({ defaultTimeframe: 'all' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      {/* Header Section */}
      <section className="bg-gradient-to-br from-primary-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              모든 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">프로젝트</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto mb-6">
              창작자들이 공유한 다양한 프로젝트를 탐색하고 영감을 받아보세요
            </p>
            
            {isAuthenticated && (
              <Link href="/create">
                <Button className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90">
                  <Plus className="w-4 h-4 mr-2" />
                  새 프로젝트 등록
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:space-x-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <Sidebar 
              selectedCategory={selectedCategory} 
              onCategoryChange={setSelectedCategory} 
            />
          </div>
          
          {/* Main Content */}
          <div className="lg:w-3/4 lg:mt-0 mt-8">
            {/* Ranking Tabs */}
            <RankingTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
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