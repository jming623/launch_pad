import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { Github, Mail, ArrowLeft, Home, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string()
    .min(9, '비밀번호는 최소 9자 이상이어야 합니다')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/, '영문, 숫자, 특수문자를 각각 포함해야 합니다'),
});

const githubSignupSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  nickname: z.string().min(2, '닉네임은 최소 2자 이상이어야 합니다'),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type GithubSignupData = z.infer<typeof githubSignupSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  
  // GitHub 회원가입 모드 감지
  const urlParams = new URLSearchParams(window.location.search);
  const isGithubSignup = urlParams.get('github_signup') === 'true';

  // Redirect if already authenticated (but not for GitHub signup)
  useEffect(() => {
    if (isAuthenticated && !isGithubSignup) {
      setLocation('/');
    }
  }, [isAuthenticated, isGithubSignup, setLocation]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const githubSignupForm = useForm<GithubSignupData>({
    resolver: zodResolver(githubSignupSchema),
    defaultValues: {
      email: '',
      nickname: '',
    },
  });

  // Email validation
  const validateEmail = debounce(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    try {
      const emailSchema = z.string().email();
      emailSchema.parse(email);
      setEmailStatus('checking');
      
      const response = await fetch('/api/user/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.available) {
          setEmailStatus('available');
          setEmailMessage('사용 가능한 이메일입니다');
        } else {
          setEmailStatus('taken');
          setEmailMessage('이미 사용 중인 이메일입니다');
        }
      } else {
        setEmailStatus('idle');
        setEmailMessage('');
      }
    } catch (error) {
      setEmailStatus('idle');
      setEmailMessage('');
    }
  }, 500);

  // Watch email changes
  const emailValue = registerForm.watch('email');
  useEffect(() => {
    if (emailValue) {
      validateEmail(emailValue);
    } else {
      setEmailStatus('idle');
      setEmailMessage('');
    }
  }, [emailValue]);

  const getEmailStatusIcon = () => {
    switch (emailStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'taken':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: '로그인 성공',
        description: user.nickname ? `환영합니다, ${user.nickname}님!` : '환영합니다!',
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: '로그인 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: '회원가입 성공',
        description: '가입이 완료되었습니다! 닉네임을 설정해주세요.',
      });
      // Navigate directly to nickname setup page
      setLocation('/nickname');
    },
    onError: (error: Error) => {
      toast({
        title: '회원가입 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const githubSignupMutation = useMutation({
    mutationFn: async (data: GithubSignupData) => {
      const response = await fetch('/api/auth/github/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'GitHub signup completion failed');
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: '회원가입 완료',
        description: `환영합니다, ${user.nickname}님! GitHub 계정으로 가입이 완료되었습니다.`,
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: '회원가입 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  const onGithubSignup = (data: GithubSignupData) => {
    githubSignupMutation.mutate(data);
  };

  // GitHub 회원가입 모드가 아닐 때만 리다이렉트
  if (isAuthenticated && !isGithubSignup) {
    return null; // Will redirect
  }

  // GitHub 회원가입 모드
  if (isGithubSignup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
        {/* Home Button */}
        <div className="absolute top-6 left-6 z-10">
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

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Left side - Form */}
          <div className="flex-1 flex items-center justify-center p-8 pt-20 min-h-0">
            <div className="w-full max-w-lg">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-violet-500 rounded-2xl mb-4 shadow-lg">
                  <Github className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  GitHub 계정으로 가입하기
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  이메일과 닉네임을 입력하여 회원가입을 완료하세요
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>회원가입 완료</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...githubSignupForm}>
                    <form onSubmit={githubSignupForm.handleSubmit(onGithubSignup)} className="space-y-4">
                      <FormField
                        control={githubSignupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="이메일을 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={githubSignupForm.control}
                        name="nickname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>닉네임</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="닉네임을 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={githubSignupMutation.isPending}
                      >
                        {githubSignupMutation.isPending ? '가입 중...' : '회원가입 완료'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Home Button */}
      <div className="absolute top-6 left-6 z-10">
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

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center p-8 pt-20 min-h-0">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                런치패드에 오신 것을 환영합니다
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                혁신적인 프로젝트를 공유하고 발견하세요
              </p>
            </div>

          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="register">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>계정에 로그인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="이메일을 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? '로그인 중...' : '로그인'}
                      </Button>
                    </form>
                  </Form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        또는 소셜 로그인
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/google'}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Google로 계속하기
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/github'}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub로 계속하기
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/replit'}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                      Replit으로 계속하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>새 계정 만들기</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="email"
                                  placeholder="이메일을 입력하세요"
                                  {...field}
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  {getEmailStatusIcon()}
                                </div>
                              </div>
                            </FormControl>
                            {emailMessage && (
                              <div className={`text-sm ${
                                emailStatus === 'available' ? 'text-green-600' : 
                                emailStatus === 'taken' ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                {emailMessage}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <div className="text-sm space-y-1 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                <span>최소 9자 이상</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                <span>영문, 숫자, 특수문자 각각 포함</span>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending || emailStatus === 'taken' || emailStatus === 'checking'}
                      >
                        {registerMutation.isPending ? '가입 중...' : '회원가입'}
                      </Button>
                    </form>
                  </Form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        또는 소셜 계정으로 가입
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/google'}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Google로 가입하기
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/github'}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub로 가입하기
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/api/auth/replit'}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                      Replit으로 가입하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Right side - Hero */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary-50 via-violet-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 items-center justify-center p-8">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating Shapes */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full animate-pulse"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-violet-500/10 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
            <div className="absolute bottom-32 left-16 w-12 h-12 bg-blue-500/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 bg-orange-500/10 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4s' }}></div>
            
            {/* Gradient Orbs */}
            <div className="absolute top-10 right-1/3 w-32 h-32 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-gradient-to-r from-blue-500/20 to-primary/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <div className="grid grid-cols-8 gap-4 h-full w-full">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="border border-gray-400 dark:border-gray-600"></div>
                ))}
              </div>
            </div>
            
            {/* Geometric Shapes */}
            <div className="absolute top-1/4 left-1/4 w-6 h-6 border-2 border-primary/30 rotate-45 animate-spin" style={{ animationDuration: '8s' }}></div>
            <div className="absolute top-3/4 right-1/3 w-8 h-8 border-2 border-violet-500/30 rotate-12 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }}></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 max-w-md text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-violet-500 rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              AI 시대의 <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">혁신적인 프로젝트들</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              개인 창작자들의 놀라운 아이디어와 창작물을 발견하고, 여러분의 프로젝트도 세상에 공유해보세요.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 p-3 rounded-lg bg-white/20 dark:bg-slate-800/30 backdrop-blur-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-200 font-medium">프로젝트 등록 및 홍보</span>
              </div>
              
              <div className="flex items-center justify-center space-x-3 p-3 rounded-lg bg-white/20 dark:bg-slate-800/30 backdrop-blur-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-violet-500 to-violet-400 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-200 font-medium">커뮤니티 피드백</span>
              </div>
              
              <div className="flex items-center justify-center space-x-3 p-3 rounded-lg bg-white/20 dark:bg-slate-800/30 backdrop-blur-sm">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-gray-700 dark:text-gray-200 font-medium">프로젝트 랭킹 시스템</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}