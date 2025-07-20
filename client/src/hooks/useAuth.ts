import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true, // 브라우저 포커스 시 재검증
    refetchOnMount: true, // 마운트 시 재검증
    refetchOnReconnect: true, // 재연결 시 재검증
    staleTime: 0, // 캐시 무효화로 항상 최신 상태 확인
    gcTime: 0, // 가비지 컬렉션 시간 0으로 설정
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
