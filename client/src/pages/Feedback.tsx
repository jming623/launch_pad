import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { insertFeedbackSchema, type FeedbackWithAuthor } from '@shared/schema';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, Heart, Star, Sparkles, ChevronLeft, ChevronRight, Edit2, Trash2, MoreVertical } from 'lucide-react';

const feedbackFormSchema = z.object({
  content: z.string().min(10, '피드백 내용을 최소 10자 이상 작성해주세요'),
  category: z.enum(['bug', 'feature', 'other'], {
    required_error: '카테고리를 선택해주세요',
  }),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

const categoryIcons = {
  bug: Bug,
  feature: Lightbulb,
  other: HelpCircle,
};

const categoryLabels = {
  bug: '버그 신고',
  feature: '기능 요청',
  other: '기타',
};

const categoryColors = {
  bug: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  feature: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  other: 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
};

export default function Feedback() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const recentFeedbackRef = useRef<HTMLDivElement>(null);
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingFeedback, setEditingFeedback] = useState<FeedbackWithAuthor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      content: '',
      category: 'other',
    },
  });

  const editForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      content: '',
      category: 'other',
    },
  });

  const watchedCategory = form.watch('category');

  const { data: feedbacks, isLoading: feedbacksLoading } = useQuery({
    queryKey: ['/api/feedback'],
  });

  // Pagination logic
  const paginatedFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return feedbacks.slice(startIndex, endIndex);
  }, [feedbacks, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!feedbacks) return 0;
    return Math.ceil(feedbacks.length / itemsPerPage);
  }, [feedbacks, itemsPerPage]);

  // Edit feedback mutation
  const editFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FeedbackFormData }) => {
      const response = await apiRequest('PUT', `/api/feedback/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setEditDialogOpen(false);
      setEditingFeedback(null);
      editForm.reset();
      
      toast({
        title: "✨ 피드백 수정 완료!",
        description: "피드백이 성공적으로 수정되었습니다.",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "수정 실패",
        description: error.message || "피드백 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/feedback/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      
      toast({
        title: "🗑️ 피드백 삭제 완료!",
        description: "피드백이 성공적으로 삭제되었습니다.",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "삭제 실패",
        description: error.message || "피드백 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });



  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const response = await apiRequest('POST', '/api/feedback', data);
      return response.json();
    },
    onSuccess: (newFeedback) => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      form.reset();
      
      // 성공 토스트
      toast({
        title: "✨ 피드백 전송 완료!",
        description: "소중한 의견 감사합니다. 검토 후 반영하겠습니다.",
        duration: 3000,
      });
      
      // 스크롤 및 강조 효과
      setTimeout(() => {
        if (recentFeedbackRef.current) {
          recentFeedbackRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          // 첫 페이지로 이동하여 새 피드백을 보여줌
          setCurrentPage(1);
          setHighlightedFeedbackId(newFeedback.id);
          
          // 3초 후 강조 효과 제거
          setTimeout(() => {
            setHighlightedFeedbackId(null);
          }, 3000);
        }
      }, 500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "전송 실패",
        description: "피드백 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    console.log('Form submitted:', data);
    console.log('Form errors:', form.formState.errors);
    
    if (!data.content?.trim()) {
      toast({
        title: "입력 오류",
        description: "피드백 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.category) {
      toast({
        title: "입력 오류", 
        description: "카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    createFeedbackMutation.mutate(data);
  };

  const onEditSubmit = (data: FeedbackFormData) => {
    if (!editingFeedback) return;
    editFeedbackMutation.mutate({ id: editingFeedback.id, data });
  };

  const handleEditClick = (feedback: FeedbackWithAuthor) => {
    setEditingFeedback(feedback);
    editForm.reset({
      content: feedback.content,
      category: feedback.category as 'bug' | 'feature' | 'other',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (feedbackId: number) => {
    deleteFeedbackMutation.mutate(feedbackId);
  };

  const getAuthorName = (author: any) => {
    if (author.lastName && author.firstName) {
      return `${author.lastName} ${author.firstName}`;
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mx-auto"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Remove authentication requirement for viewing feedback

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 transition-all duration-300">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-primary to-violet-500 rounded-full">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
            서비스 피드백
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            런치패드를 더 나은 플랫폼으로 만들어가는 데 도움을 주세요. 
            <br className="hidden sm:block" />
            버그 리포트, 기능 제안, 개선 아이디어 등 무엇이든 환영합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          {/* Feedback Form - 2/3 width */}
          <div className="xl:col-span-2">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-3 text-2xl">
                  <div className="p-2 bg-gradient-to-r from-primary to-violet-500 rounded-lg">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <span>새 피드백 작성</span>
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400">
                  구체적이고 상세한 피드백일수록 더 빠른 개선이 가능합니다
                </p>
              </CardHeader>
              
              <CardContent>
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">로그인이 필요합니다</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        피드백을 작성하려면 로그인해주세요
                      </p>
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <a href="/api/login">로그인하기</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Category Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-base font-medium">카테고리 선택 *</Label>
                    <Select 
                      value={watchedCategory} 
                      onValueChange={(value) => form.setValue('category', value as any)}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="피드백 유형을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">
                          <div className="flex items-center space-x-3 py-2">
                            <Bug className="w-5 h-5 text-red-500" />
                            <div>
                              <div className="font-medium">버그 신고</div>
                              <div className="text-sm text-gray-500">오류나 예상과 다른 동작</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="feature">
                          <div className="flex items-center space-x-3 py-2">
                            <Lightbulb className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="font-medium">기능 요청</div>
                              <div className="text-sm text-gray-500">새로운 기능이나 개선사항</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center space-x-3 py-2">
                            <HelpCircle className="w-5 h-5 text-gray-500" />
                            <div>
                              <div className="font-medium">기타</div>
                              <div className="text-sm text-gray-500">일반적인 의견이나 문의</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-sm text-red-500 flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{form.formState.errors.category.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <Label htmlFor="content" className="text-base font-medium">피드백 내용 *</Label>
                    <Textarea
                      id="content"
                      placeholder="피드백 내용을 자세히 작성해주세요...

예시:
• 버그 신고: 언제 발생했는지, 어떤 동작을 했는지, 어떤 오류가 나타났는지
• 기능 요청: 어떤 기능이 필요한지, 왜 필요한지, 어떻게 동작했으면 좋겠는지
• 기타: 사용하면서 느낀 점, 개선했으면 하는 부분 등"
                      rows={8}
                      className="text-base resize-none"
                      {...form.register('content')}
                    />
                    {form.formState.errors.content && (
                      <p className="text-sm text-red-500 flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{form.formState.errors.content.message}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <Sparkles className="w-4 h-4" />
                      <span>구체적인 상황이나 재현 방법을 포함해주시면 더 빠른 개선이 가능합니다</span>
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                    disabled={createFeedbackMutation.isPending}
                  >
                    {createFeedbackMutation.isPending ? (
                      <>
                        <div className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        전송 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-3" />
                        피드백 등록하기
                      </>
                    )}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Guidelines */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>피드백 가이드</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bug className="w-4 h-4 text-red-600" />
                      <h4 className="font-medium text-red-700 dark:text-red-400">버그 신고</h4>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      발생한 오류, 예상과 다른 동작, 성능 문제 등
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-700 dark:text-blue-400">기능 요청</h4>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      새로운 기능 아이디어나 기존 기능 개선사항
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-gray-600" />
                      <h4 className="font-medium text-gray-700 dark:text-gray-400">기타</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      일반적인 의견, 문의사항, 제휴 제안 등
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>피드백 현황</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                    <span className="font-medium">총 피드백</span>
                    <span className="text-2xl font-bold text-primary">{feedbacks?.length || 0}</span>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        <span className="text-sm">버그 신고</span>
                      </div>
                      <span className="font-medium">
                        {feedbacks?.filter((f: FeedbackWithAuthor) => f.category === 'bug').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">기능 요청</span>
                      </div>
                      <span className="font-medium">
                        {feedbacks?.filter((f: FeedbackWithAuthor) => f.category === 'feature').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <HelpCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">기타</span>
                      </div>
                      <span className="font-medium">
                        {feedbacks?.filter((f: FeedbackWithAuthor) => f.category === 'other').length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Feedback */}
        <Card ref={recentFeedbackRef} className="border-0 shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span>최근 피드백</span>
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              다른 사용자들의 피드백을 참고해보세요
            </p>
          </CardHeader>
          
          <CardContent>
            {feedbacksLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex space-x-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : feedbacks && feedbacks.length > 0 ? (
              <>
                <div className="space-y-6">
                  {paginatedFeedbacks.map((feedback: FeedbackWithAuthor) => {
                  const Icon = categoryIcons[feedback.category as keyof typeof categoryIcons];
                  const isHighlighted = highlightedFeedbackId === feedback.id;
                  return (
                    <div 
                      key={feedback.id} 
                      className={`flex space-x-4 p-4 rounded-xl transition-all duration-1000 ${
                        isHighlighted 
                          ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 ring-2 ring-emerald-400 dark:ring-emerald-600 shadow-lg transform scale-105' 
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Avatar className={`w-12 h-12 ${isHighlighted ? 'ring-2 ring-emerald-400' : ''}`}>
                        <AvatarImage src={feedback.author.profileImageUrl} />
                        <AvatarFallback className={isHighlighted ? 'bg-emerald-200 text-emerald-800' : ''}>
                          {getAuthorInitials(feedback.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-lg">{getAuthorName(feedback.author)}</span>
                            <Badge className={`${categoryColors[feedback.category as keyof typeof categoryColors]} border`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {categoryLabels[feedback.category as keyof typeof categoryLabels]}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(feedback.updatedAt || feedback.createdAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && (
                                <span className="ml-1 text-xs text-blue-500">(수정됨)</span>
                              )}
                            </span>
                          </div>
                          
                          {/* Action buttons for author */}
                          {user && feedback.authorId === user.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(feedback)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  수정
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      삭제
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>피드백 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        정말로 이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteClick(feedback.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {feedback.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>이전</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-1"
                  >
                    <span>다음</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>) : (
              <div className="text-center py-16">
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">
                  아직 피드백이 없습니다
                </h3>
                <p className="text-gray-400 dark:text-gray-500">
                  첫 번째 피드백을 남겨보세요!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>피드백 수정</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-content">피드백 내용</Label>
              <Textarea
                id="edit-content"
                placeholder="피드백 내용을 입력해주세요 (최소 10자)"
                className="min-h-[120px] resize-none"
                {...editForm.register('content')}
              />
              {editForm.formState.errors.content && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {editForm.formState.errors.content.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">카테고리</Label>
              <Select
                value={editForm.watch('category')}
                onValueChange={(value) => editForm.setValue('category', value as 'bug' | 'feature' | 'other')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center space-x-2">
                      <Bug className="w-4 h-4 text-red-500" />
                      <span>버그 신고</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="feature">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4 text-blue-500" />
                      <span>기능 요청</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4 text-gray-500" />
                      <span>기타</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {editForm.formState.errors.category && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {editForm.formState.errors.category.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={editFeedbackMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {editFeedbackMutation.isPending ? '수정 중...' : '수정하기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}