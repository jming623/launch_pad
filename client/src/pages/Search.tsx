import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ProjectWithDetails } from '@shared/schema';
import { Search as SearchIcon, ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get query from URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    if (urlQuery) {
      setSearchQuery(urlQuery);
      setSubmittedQuery(urlQuery);
    }
  }, []);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/projects/search', submittedQuery, currentPage],
    queryFn: async () => {
      if (!submittedQuery) return [];
      const params = new URLSearchParams({
        q: submittedQuery,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      const response = await fetch(`/api/projects/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!submittedQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSubmittedQuery(searchQuery.trim());
      setCurrentPage(1);
      // Update URL with search query
      const newUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const popularSearches = [
    "AI", "웹 개발", "모바일", "게임", "디자인", "도구"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6 flex items-center text-gray-600 dark:text-gray-400 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
        </Button>

        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            프로젝트 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">검색</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            찾고 있는 프로젝트의 제목이나 설명을 검색해보세요
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="프로젝트 제목이나 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 text-lg h-12"
                />
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <Button type="submit" size="lg" className="px-8">
                검색
              </Button>
            </form>
            
            {/* Popular Searches */}
            {!submittedQuery && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">인기 검색어</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <Badge
                      key={term}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setSearchQuery(term);
                        setSubmittedQuery(term);
                        setCurrentPage(1);
                        window.history.pushState({}, '', `/search?q=${encodeURIComponent(term)}`);
                      }}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {submittedQuery && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                "{submittedQuery}" 검색 결과
                {searchResults && !isLoading && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({searchResults.length}개 발견)
                  </span>
                )}
              </h2>
              
              {submittedQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSubmittedQuery('');
                    setCurrentPage(1);
                    window.history.pushState({}, '', '/search');
                  }}
                >
                  검색 초기화
                </Button>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
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
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">😞</div>
                  <h3 className="text-lg font-semibold mb-2">검색 중 오류가 발생했습니다</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    잠시 후 다시 시도해주세요
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    다시 시도
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {searchResults && !isLoading && (
              <>
                {searchResults.length > 0 ? (
                  <div className="space-y-6">
                    {searchResults.map((project: ProjectWithDetails, index: number) => (
                      <div key={project.id}>
                        <ProjectCard project={project} />
                        
                        {/* Ad Card every 3rd result */}
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

                    {/* Load More Button */}
                    {searchResults.length >= itemsPerPage && (
                      <div className="text-center mt-8">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={handleLoadMore}
                          className="px-8"
                        >
                          더 많은 결과 보기
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        다른 키워드로 검색해보시거나 인기 검색어를 참고해보세요
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {popularSearches.map((term) => (
                          <Badge
                            key={term}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              setSearchQuery(term);
                              setSubmittedQuery(term);
                              setCurrentPage(1);
                              window.history.pushState({}, '', `/search?q=${encodeURIComponent(term)}`);
                            }}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {term}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!submittedQuery && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-2">프로젝트를 검색해보세요</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                관심 있는 프로젝트를 찾아보거나 인기 검색어를 확인해보세요
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}