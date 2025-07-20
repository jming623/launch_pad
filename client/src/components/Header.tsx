import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToastAction } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Rocket, 
  Sun, 
  Moon, 
  Search, 
  User, 
  Menu, 
  ChevronDown,
  Plus,
  MessageSquare,
  LogOut,
  ArrowRight
} from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const navigation = [
    { name: '홈', href: '/' },
    { name: '프로젝트', href: '/projects' },
    { name: '등록하기', href: '/create' },
    { name: '피드백', href: '/feedback' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search:', searchQuery);
  };

  const getUserDisplayName = () => {
    if (!user) return '사용자';
    // 한국 문화권: 성(lastName) + 이름(firstName) 순서로 표시
    const fullName = `${user.firstName ? (user.lastName ? ' ' : '') + user.firstName : ''}`.trim();
    return fullName || user.email?.split('@')[0] || '사용자';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    // 성(lastName)의 첫 글자를 아바타에 표시 (한국 문화권)
    const familyName = user.lastName || user.firstName || user.email?.split('@')[0] || 'User';
    return familyName.charAt(0).toUpperCase();
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.clear(); // 모든 캐시 클리어
      toast({
        title: '로그아웃 완료',
        description: '성공적으로 로그아웃되었습니다.',
      });
      // 페이지 강제 새로고침으로 캐시 완전 초기화
      setTimeout(() => {
        window.location.replace('/'); // replace로 히스토리 스택 제거
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: '로그아웃 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      toast({
        title: "로그인 필요",
        description: "프로젝트를 등록하려면 로그인이 필요합니다.",
        variant: "destructive",
        action: (
          <ToastAction
            altText="로그인하러 가기"
            onClick={() => window.location.href = "/api/login"}
          >
            <ArrowRight className="w-4 h-4 mr-1" />
            로그인하기
          </ToastAction>
        ),
      });
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-violet-500 rounded-lg flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                런치패드
              </h1>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                item.name === '등록하기' ? (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleCreateClick}
                    className={`font-medium transition-colors ${
                      location === item.href
                        ? 'text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`font-medium transition-colors ${
                      location === item.href
                        ? 'text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </nav>
          </div>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-lg"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            {/* User Menu or Login */}
            {isLoading ? (
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block font-medium">
                      {getUserDisplayName()}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/create" className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      프로젝트 등록
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/feedback" className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      피드백
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="flex items-center text-red-600 cursor-pointer"
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <a href="/api/login">로그인</a>
              </Button>
            )}
            
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="space-y-4 mt-8">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="text"
                      placeholder="프로젝트 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </form>
                  
                  {/* Mobile Navigation */}
                  <div className="space-y-2">
                    {navigation.map((item) => (
                      item.name === '등록하기' ? (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`block px-3 py-2 rounded-md transition-colors ${
                            location === item.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          onClick={(e) => {
                            handleCreateClick(e);
                            setMobileMenuOpen(false);
                          }}
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`block px-3 py-2 rounded-md transition-colors ${
                            location === item.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      )
                    ))}
                  </div>
                  
                  {/* Mobile User Actions */}
                  {isAuthenticated && user ? (
                    <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getUserDisplayName()}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                      >
                        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="w-full">
                      <a href="/api/login">로그인</a>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
