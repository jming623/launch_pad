import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false, // 포커스 시 재검증 비활성화
    refetchOnMount: false, // 마운트 시 재검증 비활성화 (첫 로드만)
    refetchOnReconnect: false, // 재연결 시 재검증 비활성화
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 보류
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
