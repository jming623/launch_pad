import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { insertFeedbackSchema, type FeedbackWithAuthor } from '@shared/schema';
import { useEffect } from 'react';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send } from 'lucide-react';

const feedbackFormSchema = insertFeedbackSchema.extend({
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
  bug: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  feature: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
};

export default function Feedback() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      content: '',
      category: 'other',
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "피드백을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: feedbacks, isLoading: feedbacksLoading } = useQuery({
    queryKey: ['/api/feedback'],
    enabled: isAuthenticated,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const response = await apiRequest('POST', '/api/feedback', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      form.reset();
      toast({
        title: "피드백 전송 완료!",
        description: "소중한 의견 감사합니다. 검토 후 반영하겠습니다.",
      });
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
    createFeedbackMutation.mutate(data);
  };

  const getAuthorName = (author: any) => {
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    if (author.firstName) return author.firstName;
    if (author.email) return author.email.split('@')[0];
    return '사용자';
  };

  const getAuthorInitials = (author: any) => {
    if (author.firstName) return author.firstName.charAt(0).toUpperCase();
    if (author.email) return author.email.charAt(0).toUpperCase();
    return 'U';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            서비스 피드백
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            런치패드를 더 나은 플랫폼으로 만들어가는 데 도움을 주세요. 버그 리포트, 기능 제안, 개선 아이디어 등 무엇이든 환영합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>새 피드백 작성</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리 *</Label>
                  <Select
                    onValueChange={(value) => form.setValue('category', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="피드백 유형을 선택하세요" />
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
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">내용 *</Label>
                  <Textarea
                    id="content"
                    placeholder="피드백 내용을 자세히 작성해주세요..."
                    rows={6}
                    {...form.register('content')}
                  />
                  {form.formState.errors.content && (
                    <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    구체적인 상황이나 재현 방법을 포함해주시면 더 빠른 개선이 가능합니다.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createFeedbackMutation.isPending}
                >
                  {createFeedbackMutation.isPending ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      전송 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      피드백 전송하기
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Feedback Guidelines */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>피드백 가이드라인</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Bug className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-700 dark:text-red-400">버그 신고</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        발생한 오류, 예상과 다른 동작, 성능 문제 등을 신고해주세요.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-700 dark:text-blue-400">기능 요청</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        새로운 기능 아이디어나 기존 기능의 개선사항을 제안해주세요.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-400">기타</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        일반적인 의견, 문의사항, 제휴 제안 등을 남겨주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>피드백 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">총 피드백</span>
                    <span className="font-medium">{feedbacks?.length || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">버그 신고</span>
                    <span className="font-medium">
                      {feedbacks?.filter((f: FeedbackWithAuthor) => f.category === 'bug').length || 0}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">기능 요청</span>
                    <span className="font-medium">
                      {feedbacks?.filter((f: FeedbackWithAuthor) => f.category === 'feature').length || 0}개
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Feedback */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>최근 피드백</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              다른 사용자들의 피드백을 참고해보세요
            </p>
          </CardHeader>
          
          <CardContent>
            {feedbacksLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : feedbacks && feedbacks.length > 0 ? (
              <div className="space-y-6">
                {feedbacks.slice(0, 10).map((feedback: FeedbackWithAuthor) => {
                  const Icon = categoryIcons[feedback.category as keyof typeof categoryIcons];
                  return (
                    <div key={feedback.id} className="flex space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={feedback.author.profileImageUrl} />
                        <AvatarFallback>{getAuthorInitials(feedback.author)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{getAuthorName(feedback.author)}</span>
                          <Badge className={categoryColors[feedback.category as keyof typeof categoryColors]}>
                            <Icon className="w-3 h-3 mr-1" />
                            {categoryLabels[feedback.category as keyof typeof categoryLabels]}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {feedback.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  아직 피드백이 없습니다. 첫 번째 피드백을 남겨보세요!
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
