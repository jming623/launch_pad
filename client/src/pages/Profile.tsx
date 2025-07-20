import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, User, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [nickname, setNickname] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState("");

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "");
      setAvatarPreview(user.profileImageUrl || "");
    }
  }, [user]);

  // Debounced nickname validation
  useEffect(() => {
    if (!nickname || nickname === user?.nickname) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }

    setNicknameStatus('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/user/validate-nickname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (data.valid) {
            setNicknameStatus('available');
            setNicknameMessage(data.message);
          } else {
            setNicknameStatus('invalid');
            setNicknameMessage(data.message);
          }
        } else {
          setNicknameStatus('taken');
          setNicknameMessage(data.message);
        }
      } catch (error) {
        setNicknameStatus('idle');
        setNicknameMessage('');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nickname, user?.nickname]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "파일 크기 초과",
          description: "프로필 사진은 5MB 이하여야 합니다.",
          variant: "destructive",
        });
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Profile update failed');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: '프로필 업데이트 완료',
        description: '프로필이 성공적으로 업데이트되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '프로필 업데이트 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nicknameStatus === 'taken' || nicknameStatus === 'invalid') {
      toast({
        title: "닉네임 오류",
        description: nicknameMessage,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('nickname', nickname);
    
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    
    updateProfileMutation.mutate(formData);
  };

  const getNicknameStatusIcon = () => {
    switch (nicknameStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'taken':
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    setLocation('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈으로 돌아가기</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              프로필 수정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarPreview} alt="프로필 사진" />
                  <AvatarFallback className="text-lg">
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col items-center space-y-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>프로필 사진 업로드</span>
                    </div>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    JPG, PNG 파일만 업로드 가능 (최대 5MB)
                  </p>
                </div>
              </div>

              {/* Nickname Section */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  닉네임
                </Label>
                <div className="relative">
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="pr-10"
                    placeholder="닉네임을 입력하세요"
                    maxLength={20}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getNicknameStatusIcon()}
                  </div>
                </div>
                {nicknameMessage && (
                  <p className={`text-xs ${
                    nicknameStatus === 'available' ? 'text-green-600 dark:text-green-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {nicknameMessage}
                  </p>
                )}
              </div>

              {/* Email Section (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  이메일
                </Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/')}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateProfileMutation.isPending ||
                    nicknameStatus === 'checking' ||
                    nicknameStatus === 'taken' ||
                    nicknameStatus === 'invalid' ||
                    (!nickname.trim())
                  }
                  className="min-w-[100px]"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '저장'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}