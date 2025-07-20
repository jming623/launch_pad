import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, Loader2, User, Home } from 'lucide-react';
import { debounce } from 'lodash';

const nicknameSchema = z.object({
  nickname: z.string()
    .min(2, '닉네임은 최소 2글자 이상이어야 합니다')
    .max(20, '닉네임은 최대 20글자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z0-9_]+$/, '닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다'),
});

type NicknameData = z.infer<typeof nicknameSchema>;

export default function NicknameSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  // Redirect if nickname already set
  useEffect(() => {
    if (user?.hasSetNickname) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const form = useForm<NicknameData>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: {
      nickname: '',
    },
  });

  // Debounced nickname validation
  const validateNickname = debounce(async (nickname: string) => {
    if (!nickname || nickname.length < 2) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }

    try {
      nicknameSchema.parse({ nickname });
      setNicknameStatus('checking');
      
      const response = await fetch('/api/user/validate-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.valid) {
        setNicknameStatus('valid');
        setNicknameMessage(result.message);
      } else {
        setNicknameStatus('invalid');
        setNicknameMessage(result.message || '닉네임을 확인할 수 없습니다');
      }
    } catch (error: any) {
      setNicknameStatus('invalid');
      if (error.issues) {
        setNicknameMessage(error.issues[0]?.message || '올바르지 않은 닉네임 형식입니다');
      } else {
        setNicknameMessage('닉네임 검증 중 오류가 발생했습니다');
      }
    }
  }, 500);

  // Watch nickname changes
  const nicknameValue = form.watch('nickname');
  useEffect(() => {
    validateNickname(nicknameValue);
  }, [nicknameValue]);

  const setNicknameMutation = useMutation({
    mutationFn: async (data: NicknameData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nickname: data.nickname,
          hasSetNickname: true
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set nickname');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: '닉네임 설정 완료',
        description: `환영합니다, ${updatedUser.nickname}님!`,
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: '닉네임 설정 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: NicknameData) => {
    if (nicknameStatus !== 'valid') {
      toast({
        title: '닉네임 확인',
        description: '유효한 닉네임을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }
    setNicknameMutation.mutate(data);
  };

  const getNicknameStatusIcon = () => {
    switch (nicknameStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            닉네임 설정
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            프로젝트헌터에서 사용할 닉네임을 설정해주세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">닉네임 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>닉네임</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="닉네임을 입력하세요"
                            {...field}
                            className="pr-10"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {getNicknameStatusIcon()}
                          </div>
                        </div>
                      </FormControl>
                      {nicknameMessage && (
                        <p className={`text-sm ${nicknameStatus === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
                          {nicknameMessage}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>• 2-20글자로 입력해주세요</p>
                  <p>• 한글, 영문, 숫자, 언더스코어(_)만 사용 가능</p>
                  <p>• 부적절한 내용은 포함할 수 없습니다</p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={setNicknameMutation.isPending || nicknameStatus !== 'valid'}
                >
                  {setNicknameMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      설정 중...
                    </>
                  ) : (
                    '닉네임 설정 완료'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation('/')}
                >
                  <Home className="mr-2 h-4 w-4" />
                  나중에 설정하기
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            닉네임은 나중에 프로필에서 변경할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}