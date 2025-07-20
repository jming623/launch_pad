import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProjectCard } from '@/components/ProjectCard';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectWithDetails } from '@shared/schema';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

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
      return response.json();
    },
  });

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
                          <Skeleton className="h-4 w-3/4 mb-4" />
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : projects?.length > 0 ? (
                projects.map((project: ProjectWithDetails) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project}
                    showFullDescription={true}
                  />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <CardContent>
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold mb-2">아직 프로젝트가 없습니다</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      첫 번째 프로젝트를 등록해보세요!
                    </p>
                    {isAuthenticated && (
                      <Link href="/create">
                        <Button className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90">
                          <Plus className="w-4 h-4 mr-2" />
                          프로젝트 등록하기
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}