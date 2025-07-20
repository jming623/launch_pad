import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import type { ProjectWithDetails, CommentWithAuthor } from '@shared/schema';
import { 
  Heart, 
  Eye, 
  MessageSquare, 
  Share2, 
  ExternalLink,
  Calendar,
  User,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/projects', id, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/projects', id], (oldData: ProjectWithDetails) => {
        if (!oldData) return oldData;
        return { ...oldData, likeCount: data.likeCount, isLiked: data.liked };
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

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      const response = await apiRequest('POST', `/api/projects/${id}/comments`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      setCommentContent('');
      setReplyingTo(null);
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "댓글을 작성하려면 로그인이 필요합니다.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/projects/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '프로젝트 삭제 완료',
        description: '프로젝트가 성공적으로 삭제되었습니다.',
      });
      window.location.href = '/';
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "권한 없음",
          description: "본인이 작성한 프로젝트만 삭제할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: '프로젝트 삭제 실패',
        description: '프로젝트 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
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

  const handleComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "댓글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (!commentContent.trim()) {
      toast({
        title: "오류",
        description: "댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    commentMutation.mutate({
      content: commentContent,
      parentId: replyingTo || undefined,
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "링크 복사됨",
        description: "프로젝트 링크가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
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

  const getAuthorName = (author: any) => {
    if (author.lastName && author.firstName) {
      return `${author.lastName}${author.firstName}`;
    }
    if (author.firstName) return author.firstName;
    if (author.email) return author.email.split('@')[0];
    return '사용자';
  };

  const getAuthorInitials = (author: any) => {
    if (author.lastName) return author.lastName.charAt(0).toUpperCase();
    if (author.firstName) return author.firstName.charAt(0).toUpperCase();
    if (author.email) return author.email.charAt(0).toUpperCase();
    return 'U';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold mb-2">프로젝트를 찾을 수 없습니다</h1>
              <p className="text-gray-600 dark:text-gray-400">
                요청하신 프로젝트가 존재하지 않거나 삭제되었습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Badge className={getCategoryColor(project.category?.name)}>
              {project.category?.name || '미분류'}
            </Badge>
            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{new Date(project.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {project.title}
          </h1>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={project.author.profileImageUrl} />
                  <AvatarFallback>{getAuthorInitials(project.author)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{getAuthorName(project.author)}</span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{project.viewCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className={`w-4 h-4 ${project.isLiked ? 'text-red-500 fill-current' : ''}`} />
                  <span>{project.likeCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{project.commentCount?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={project.isLiked ? 'text-red-500 border-red-500' : ''}
              >
                <Heart className={`w-4 h-4 mr-2 ${project.isLiked ? 'fill-current' : ''}`} />
                좋아요
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                공유
              </Button>
              
              {/* Edit/Delete buttons for project owner */}
              {isAuthenticated && user?.id === project.authorId && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/projects/${id}/edit`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteProjectMutation.mutate()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          삭제하기
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Project Image */}
        {project.imageUrl && (
          <div className="mb-8">
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                console.log('Image failed to load:', project.imageUrl);
              }}
            />
          </div>
        )}

        {/* Project Video */}
        {project.videoUrl && (
          <div className="mb-8">
            <div className="aspect-video bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
              {project.videoUrl.includes('youtube.com') || project.videoUrl.includes('youtu.be') ? (
                <iframe
                  src={project.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  title={project.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={project.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              )}
            </div>
          </div>
        )}

        {/* Project Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
              {project.content && (
                <div className="mt-6 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {project.content}
                </div>
              )}
            </div>
            
            {/* Links */}
            <div className="mt-6 flex flex-wrap gap-4">
              {project.demoUrl && (
                <Button asChild variant="default">
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    데모 보기
                  </a>
                </Button>
              )}
              {project.videoUrl && (
                <Button asChild variant="outline">
                  <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    영상 보기
                  </a>
                </Button>
              )}
              {project.contactInfo && (
                <Button asChild variant="outline">
                  <a href={`mailto:${project.contactInfo}`}>
                    연락하기
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>댓글 ({comments?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comment Form */}
            <div className="space-y-4">
              {replyingTo && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  댓글에 답글을 작성 중입니다.{' '}
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-primary hover:underline"
                  >
                    취소
                  </button>
                </div>
              )}
              <Textarea
                placeholder={isAuthenticated ? "댓글을 작성해주세요..." : "댓글을 작성하려면 로그인이 필요합니다."}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={!isAuthenticated}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {!isAuthenticated && (
                    <>
                      <a href="/api/login" className="text-primary hover:underline">
                        로그인
                      </a>
                      하여 댓글을 작성해보세요.
                    </>
                  )}
                </p>
                <Button
                  onClick={handleComment}
                  disabled={!isAuthenticated || !commentContent.trim() || commentMutation.isPending}
                >
                  {replyingTo ? '답글 작성' : '댓글 작성'}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-6">
                {comments.map((comment: CommentWithAuthor) => (
                  <div key={comment.id} className="space-y-4">
                    {/* Main Comment */}
                    <div className="flex space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author.profileImageUrl} />
                        <AvatarFallback>{getAuthorInitials(comment.author)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{getAuthorName(comment.author)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit', 
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <button
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
                          >
                            <Reply className="w-3 h-3 mr-1 inline" />
                            답글
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 space-y-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex space-x-3">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={reply.author.profileImageUrl} />
                              <AvatarFallback className="text-xs">{getAuthorInitials(reply.author)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">{getAuthorName(reply.author)}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(reply.createdAt).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit', 
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
