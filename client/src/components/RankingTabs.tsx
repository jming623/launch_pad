import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Flame, TrendingUp, Trophy, Crown, Filter, Check } from 'lucide-react';

interface RankingTabsProps {
  activeTab: 'today' | 'weekly' | 'monthly' | 'all';
  onTabChange: (tab: 'today' | 'weekly' | 'monthly' | 'all') => void;
  selectedCategory?: number;
  onCategoryChange: (categoryId?: number) => void;
}

export function RankingTabs({ 
  activeTab, 
  onTabChange, 
  selectedCategory, 
  onCategoryChange 
}: RankingTabsProps) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories', { withCounts: true }],
    queryFn: async () => {
      const response = await fetch('/api/categories?withCounts=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const selectedCategoryName = selectedCategory 
    ? categories?.find((cat: any) => cat.id === selectedCategory)?.name
    : '전체';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange as any} className="flex-1">
        <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1">
          <TabsTrigger 
            value="today" 
            className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Today</span>
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Weekly</span>
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Monthly</span>
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Crown className="w-4 h-4" />
            <span className="hidden sm:inline">All Time</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category Filter Dropdown - Only visible on mobile when sidebar is hidden */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden flex items-center space-x-2 whitespace-nowrap">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{selectedCategoryName}</span>
            <span className="sm:hidden">필터</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => onCategoryChange(undefined)}
            className="flex items-center justify-between"
          >
            <span>전체</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {stats?.totalProjects || 0}
              </span>
              {selectedCategory === undefined && <Check className="w-4 h-4" />}
            </div>
          </DropdownMenuItem>
          
          {!isLoading && categories?.map((category: any) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className="flex items-center justify-between"
            >
              <span>{category.name}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {category.projectCount || 0}
                </span>
                {selectedCategory === category.id && <Check className="w-4 h-4" />}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
