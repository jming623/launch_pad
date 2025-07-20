import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  selectedCategory?: number;
  onCategoryChange: (categoryId?: number) => void;
}

export function Sidebar({ selectedCategory, onCategoryChange }: SidebarProps) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  return (
    <aside className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">카테고리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </>
          ) : (
            <>
              <Button
                variant={selectedCategory === undefined ? "default" : "ghost"}
                className="w-full justify-between"
                onClick={() => onCategoryChange(undefined)}
              >
                전체
                <span className="text-sm">
                  {stats?.totalProjects || 0}
                </span>
              </Button>
              
              {categories?.map((category: any) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => onCategoryChange(category.id)}
                >
                  {category.name}
                  <span className="text-sm">
                    {/* TODO: Add project count per category */}
                    0
                  </span>
                </Button>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ad Space */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-2">
            광고
          </div>
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-8 text-center">
            <div className="text-2xl mb-2">📢</div>
            <p className="text-sm text-gray-500">Google Ads</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">통계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">총 프로젝트</span>
              <span className="font-medium">{stats?.totalProjects?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">활성 사용자</span>
              <span className="font-medium">{stats?.totalUsers?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">일일 방문자</span>
              <span className="font-medium">{stats?.todayVisits?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">총 좋아요</span>
              <span className="font-medium">{stats?.totalLikes?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
