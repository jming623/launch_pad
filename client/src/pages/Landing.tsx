import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProjectCard } from '@/components/ProjectCard';
import { RankingTabs } from '@/components/RankingTabs';
import { Sidebar } from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import type { ProjectWithDetails } from '@shared/schema';

export default function Landing() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly' | 'all'>('today');
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

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI 시대의 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">개인 프로젝트</span>를 세상에
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              혁신적인 아이디어와 창작물을 더 많은 사람들과 공유하고,<br />
              새로운 기회를 발견하세요
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                size="lg"
                onClick={() => setLocation('/auth')}
              >
                지금 시작하기
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#projects">프로젝트 둘러보기</Link>
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {stats?.totalProjects?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">등록된 프로젝트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {stats?.totalUsers?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">활성 사용자</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {stats?.todayVisits?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">일일 방문자수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {stats?.totalLikes?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">총 좋아요</div>
            </div>
          </div>
        </div>
      </section>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="projects">
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
              ) : projects && projects.length > 0 ? (
                <>
                  {projects.map((project: ProjectWithDetails, index: number) => (
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
                      첫 번째 프로젝트를 등록해보세요!
                    </p>
                    <Button asChild>
                      <span 
                        className="cursor-pointer"
                        onClick={() => setLocation('/auth')}
                      >
                        로그인하고 프로젝트 등록하기
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Load More Button */}
              {projects && projects.length > 0 && (
                <div className="text-center mt-8">
                  <Button variant="outline" size="lg">
                    더 많은 프로젝트 보기
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
