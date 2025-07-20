import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, TrendingUp, Trophy, Crown } from 'lucide-react';

interface RankingTabsProps {
  activeTab: 'today' | 'weekly' | 'monthly' | 'all';
  onTabChange: (tab: 'today' | 'weekly' | 'monthly' | 'all') => void;
}

export function RankingTabs({ activeTab, onTabChange }: RankingTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange as any} className="w-full">
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
  );
}
