import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import type { ProjectWithDetails } from '@shared/schema';
import { Heart, Eye, MessageSquare, User } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectWithDetails;
  rank?: number;
}

export function ProjectCard({ project, rank }: ProjectCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${project.id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update the project in cache
      queryClient.setQueryData(['projects'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: ProjectWithDetails) =>
          p.id === project.id
            ? { ...p, likeCount: data.likeCount, isLiked: data.liked }
            : p
        );
      });

      toast({
        title: data.liked ? '좋아요!' : '좋아요 취소',
        description: data.liked ? '프로젝트를 좋아요했습니다.' : '좋아요를 취소했습니다.',
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "좋아요를 누르려면 로그인이 필요합니다.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "좋아요 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "좋아요를 누르려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    likeMutation.mutate();
  };

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    
    const colors = {
      '웹 앱': 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200',
      '모바일 앱': 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
      'AI 도구': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      '게임': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      '기타': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    };
    
    return colors[categoryName as keyof typeof colors] || colors['기타'];
  };

  const getAuthorInitials = (author: any) => {
    if (author.firstName) return author.firstName.charAt(0).toUpperCase();
    if (author.email) return author.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getAuthorName = (author: any) => {
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    if (author.firstName) return author.firstName;
    if (author.email) return author.email.split('@')[0];
    return '사용자';
  };

  return (
    <Card className="overflow-hidden project-card hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="md:flex">
        <div className="md:w-1/3">
          <Link href={`/projects/${project.id}`}>
            <div className="relative w-full h-48 md:h-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
              {project.imageUrl ? (
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                    <p className="text-sm">이미지 없음</p>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>
        
        <CardContent className="md:w-2/3 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className={getCategoryColor(project.category?.name)}>
                  {project.category?.name || '미분류'}
                </Badge>
                {rank && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {rank}위
                  </span>
                )}
              </div>
              
              <Link href={`/projects/${project.id}`}>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary transition-colors line-clamp-2">
                  {project.title}
                </h3>
              </Link>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                {project.description}
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center space-x-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={project.author.profileImageUrl} />
                    <AvatarFallback className="text-xs">
                      {getAuthorInitials(project.author)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getAuthorName(project.author)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{project.viewCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className={`w-3 h-3 ${project.isLiked ? 'text-red-500 fill-current' : ''}`} />
                  <span>{project.likeCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{project.commentCount?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              {project.demoUrl && (
                <div className="mb-3">
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-600 text-sm font-medium transition-colors"
                  >
                    데모 보기 →
                  </a>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className="ml-4 text-gray-400 hover:text-red-500"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  project.isLiked ? 'text-red-500 fill-current' : ''
                }`}
              />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
