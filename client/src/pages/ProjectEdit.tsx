import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { ProjectWithDetails, Category } from "@shared/schema";

const projectEditSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").min(3, "제목은 3글자 이상이어야 합니다"),
  description: z.string().min(1, "설명을 입력해주세요").min(10, "설명은 10글자 이상이어야 합니다"),
  categoryId: z.number().min(1, "카테고리를 선택해주세요"),
  imageUrl: z.string().optional(),
  videoUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().or(z.literal("")),
  demoUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().or(z.literal("")),
  githubUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().or(z.literal("")),
  techStack: z.string().optional(),
});

type ProjectEditForm = z.infer<typeof projectEditSchema>;

export default function ProjectEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json() as ProjectWithDetails;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Category[];
    },
  });

  const form = useForm<ProjectEditForm>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: 0,
      imageUrl: "",
      videoUrl: "",
      demoUrl: "",
      githubUrl: "",
      techStack: "",
    },
  });

  // Set form values when project data is loaded
  React.useEffect(() => {
    if (project) {
      form.reset({
        title: project.title,
        description: project.description,
        categoryId: project.categoryId,
        imageUrl: project.imageUrl || "",
        videoUrl: project.videoUrl || "",
        demoUrl: project.demoUrl || "",
        githubUrl: project.githubUrl || "",
        techStack: project.techStack || "",
      });
      setImagePreview(project.imageUrl || "");
    }
  }, [project, form]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectEditForm) => {
      const response = await apiRequest('PUT', `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      toast({
        title: "프로젝트 수정 완료",
        description: "프로젝트가 성공적으로 수정되었습니다.",
      });
      setLocation(`/projects/${id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "권한 없음",
          description: "본인이 작성한 프로젝트만 수정할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "수정 실패",
        description: "프로젝트 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const onSubmit = (data: ProjectEditForm) => {
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "프로젝트를 수정하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    updateProjectMutation.mutate(data);
  };

  if (projectLoading) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            프로젝트 수정
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            프로젝트 정보를 수정하세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>프로젝트 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로젝트 제목 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="프로젝트 제목을 입력하세요"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로젝트 설명 *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="프로젝트에 대한 자세한 설명을 입력하세요"
                          className="min-h-[120px] text-base resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리 *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로젝트 이미지</FormLabel>
                      <div className="space-y-4">
                        <FormControl>
                          <Input
                            placeholder="이미지 URL을 입력하거나 아래 버튼으로 파일을 업로드하세요"
                            {...field}
                            className="text-base"
                            onChange={(e) => {
                              field.onChange(e);
                              setImagePreview(e.target.value);
                            }}
                          />
                        </FormControl>
                        
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            파일 업로드
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>

                        {imagePreview && (
                          <div className="mt-4">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          이미지 URL을 입력하거나 📷 버튼을 클릭해서 파일을 업로드하세요 (500KB 이하)
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Video URL */}
                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>데모 비디오 URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="YouTube, Vimeo 등의 비디오 URL을 입력하세요"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Demo URL */}
                <FormField
                  control={form.control}
                  name="demoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>데모 사이트 URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GitHub URL */}
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://github.com/username/repository"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tech Stack */}
                <FormField
                  control={form.control}
                  name="techStack"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>기술 스택</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="React, Node.js, TypeScript 등 (쉼표로 구분)"
                          {...field}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/projects/${id}`)}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProjectMutation.isPending}
                    className="flex-1"
                  >
                    {updateProjectMutation.isPending ? "수정 중..." : "수정하기"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}