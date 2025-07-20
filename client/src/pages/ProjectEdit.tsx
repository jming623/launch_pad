import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";
import { Upload, ImageIcon, Link, Mail, ArrowLeft } from "lucide-react";
import type { ProjectWithDetails } from "@shared/schema";

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

export default function ProjectEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json() as ProjectWithDetails;
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated,
  });

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

  // Set form values when project data is loaded
  useEffect(() => {
    if (project) {
      form.reset({
        title: project.title,
        description: project.description,
        content: project.content || '',
        imageUrl: project.imageUrl || '',
        videoUrl: project.videoUrl || '',
        demoUrl: project.demoUrl || '',
        contactInfo: project.contactInfo || '',
        categoryId: project.categoryId,
      });
      setImagePreview(project.imageUrl || '');
    }
  }, [project, form]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest('PUT', `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      toast({
        title: "프로젝트 수정 완료!",
        description: "프로젝트가 성공적으로 수정되었습니다.",
      });
      setLocation(`/projects/${id}`);
    },
    onError: (error) => {
      console.error('Project update error:', error);
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
        description: `프로젝트 수정 중 오류가 발생했습니다: ${error.message}`,
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
    updateProjectMutation.mutate(processedData);
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

  if (authLoading || projectLoading) {
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  if (!isAuthenticated || user?.id !== project.authorId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h1>
              <p className="text-gray-600 dark:text-gray-400">
                본인이 작성한 프로젝트만 수정할 수 있습니다.
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
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 p-0 h-auto font-normal text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setLocation(`/projects/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            프로젝트로 돌아가기
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              프로젝트 수정
            </CardTitle>
            <p className="text-center text-gray-600 dark:text-gray-400">
              프로젝트 정보를 수정하세요
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
                  value={form.watch('categoryId')?.toString()}
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
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="relative"
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
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
                  disabled={updateProjectMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {updateProjectMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>수정 중...</span>
                    </div>
                  ) : (
                    '프로젝트 수정하기'
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation(`/projects/${id}`)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}