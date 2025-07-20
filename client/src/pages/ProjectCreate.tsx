import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { insertProjectSchema } from '@shared/schema';
import { useEffect } from 'react';
import { Upload, ImageIcon, Link, Mail } from 'lucide-react';

const projectFormSchema = insertProjectSchema.omit({ 
  authorId: true,
  id: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  categoryId: z.number().min(1, '카테고리를 선택해주세요'),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function ProjectCreate() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      imageUrl: '',
      videoUrl: '',
      demoUrl: '',
      contactInfo: '',
      categoryId: 0,
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "프로젝트를 등록하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: (project) => {
      toast({
        title: "프로젝트 등록 완료!",
        description: "프로젝트가 성공적으로 등록되었습니다.",
      });
      setLocation(`/projects/${project.id}`);
    },
    onError: (error) => {
      console.error('Project creation error:', error);
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
        title: "등록 실패",
        description: `프로젝트 등록 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    console.log('Form data submitted:', data);
    console.log('Form errors:', form.formState.errors);
    
    // Ensure categoryId is valid
    if (!data.categoryId || data.categoryId === 0) {
      toast({
        title: "카테고리 선택 필요",
        description: "프로젝트 카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert categoryId to number if it's a string
    const processedData = {
      ...data,
      categoryId: typeof data.categoryId === 'string' ? parseInt(data.categoryId) : data.categoryId,
    };
    
    console.log('Processed data:', processedData);
    createProjectMutation.mutate(processedData);
  };

  const handleImageUrlChange = (url: string) => {
    form.setValue('imageUrl', url);
    setImagePreview(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "파일 형식 오류",
        description: "이미지 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (500KB limit for base64 encoding)
    if (file.size > 500 * 1024) {
      toast({
        title: "파일 크기 오류",
        description: "500KB 이하의 이미지만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a FormData object for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Convert to base64 for storage (in production, upload to cloud storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);

      toast({
        title: "이미지 업로드 완료",
        description: "이미지가 성공적으로 업로드되었습니다.",
      });
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              새 프로젝트 등록
            </CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400">
              당신의 멋진 프로젝트를 세상에 선보이세요
            </p>
          </CardHeader>
          
          <CardContent>
            <form 
              onSubmit={(e) => {
                console.log('Form submit triggered!');
                return form.handleSubmit(onSubmit)(e);
              }} 
              className="space-y-6"
            >
              {/* Project Title */}
              <div className="space-y-2">
                <Label htmlFor="title">프로젝트 제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: AI 기반 생산성 도구"
                  {...form.register('title')}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select
                  onValueChange={(value) => {
                    const categoryId = parseInt(value);
                    form.setValue('categoryId', categoryId);
                    form.clearErrors('categoryId');
                  }}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-500">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">간단한 설명 *</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트에 대한 간단한 설명을 작성하세요 (2-3줄 정도)"
                  rows={3}
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Detailed Content */}
              <div className="space-y-2">
                <Label htmlFor="content">상세 내용</Label>
                <Textarea
                  id="content"
                  placeholder="프로젝트의 상세한 내용을 작성하세요 (기능, 특징, 사용 기술 등)"
                  rows={6}
                  {...form.register('content')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  선택사항입니다. 더 자세한 설명을 원한다면 작성하세요.
                </p>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">프로젝트 이미지</Label>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      id="imageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...form.register('imageUrl')}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="미리보기"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  이미지 URL을 입력하거나 ⬆️ 버튼을 클릭해서 파일을 업로드하세요 (500KB 이하)
                </p>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label htmlFor="videoUrl">데모 비디오 URL</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      id="videoUrl"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...form.register('videoUrl')}
                    />
                  </div>
                  <Link className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  선택사항입니다. YouTube, Vimeo 등의 비디오 링크를 추가하세요.
                </p>
              </div>

              {/* Demo URL */}
              <div className="space-y-2">
                <Label htmlFor="demoUrl">데모 사이트 URL</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      id="demoUrl"
                      type="url"
                      placeholder="https://my-awesome-project.vercel.app"
                      {...form.register('demoUrl')}
                    />
                  </div>
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  선택사항입니다. 실제 작동하는 사이트가 있다면 링크를 추가하세요.
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <Label htmlFor="contactInfo">연락처 정보</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      id="contactInfo"
                      placeholder="이메일, SNS, GitHub 등"
                      {...form.register('contactInfo')}
                    />
                  </div>
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  선택사항입니다. 프로젝트에 관심 있는 사람들이 연락할 수 있는 정보를 입력하세요.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createProjectMutation.isPending}
                  onClick={async (e) => {
                    console.log('Submit button clicked!');
                    e.preventDefault();
                    const formData = form.getValues();
                    console.log('Current form data:', formData);
                    
                    // Manually trigger form validation and submission
                    const isValid = await form.trigger();
                    console.log('Form validation result:', isValid);
                    
                    if (isValid) {
                      console.log('Form is valid, calling onSubmit directly');
                      onSubmit(formData);
                    } else {
                      console.log('Form validation failed:', form.formState.errors);
                      
                      // Scroll to first error field and highlight it
                      const firstErrorField = Object.keys(form.formState.errors)[0];
                      if (firstErrorField) {
                        const element = document.getElementById(firstErrorField);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.style.borderColor = '#ef4444';
                          element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          
                          // Reset styling after 3 seconds
                          setTimeout(() => {
                            element.style.borderColor = '';
                            element.style.boxShadow = '';
                          }, 3000);
                        }
                      }
                      
                      // Show error toast
                      toast({
                        title: "입력 오류",
                        description: "필수 항목을 모두 입력해주세요.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      프로젝트 등록하기
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  등록하기 버튼을 누르면{' '}
                  <a href="#" className="text-primary hover:underline">이용약관</a>과{' '}
                  <a href="#" className="text-primary hover:underline">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
