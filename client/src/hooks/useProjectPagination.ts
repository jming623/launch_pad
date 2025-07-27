import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { ProjectWithDetails } from '@shared/schema';

interface UseProjectPaginationOptions {
  defaultTimeframe?: 'today' | 'weekly' | 'monthly' | 'all';
  limit?: number;
  userId?: string;
}

interface ProjectPaginationState {
  currentPage: number;
  allProjects: ProjectWithDetails[];
  noMoreProjects: boolean;
  hasTriedLoadMore: boolean;
}

export function useProjectPagination({
  defaultTimeframe = 'today',
  limit = 5,
  userId
}: UseProjectPaginationOptions = {}) {
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly' | 'all'>(defaultTimeframe);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [state, setState] = useState<ProjectPaginationState>({
    currentPage: 1,
    allProjects: [],
    noMoreProjects: false,
    hasTriedLoadMore: false,
  });

  const buildParams = (page: number = 1) => {
    const params = new URLSearchParams({
      timeframe: activeTab,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (selectedCategory) {
      params.set('categoryId', selectedCategory.toString());
    }
    
    return params;
  };

  const fetchProjects = async (page: number = 1) => {
    const params = buildParams(page);
    const response = await fetch(`/api/projects?${params}`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects', { 
      timeframe: activeTab, 
      categoryId: selectedCategory,
      page: 1,
      limit,
      userId 
    }],
    queryFn: () => fetchProjects(1),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Handle data changes separately
  useEffect(() => {
    if (projects) {
      setState({
        currentPage: 1,
        allProjects: projects,
        noMoreProjects: projects.length < limit,
        hasTriedLoadMore: false,
      });
    }
  }, [projects, limit]);

  const loadMoreMutation = useMutation({
    mutationFn: () => fetchProjects(state.currentPage + 1),
    onSuccess: (newProjects: ProjectWithDetails[]) => {
      setState(prev => ({
        ...prev,
        hasTriedLoadMore: true,
        noMoreProjects: newProjects.length < limit || newProjects.length === 0,
        ...(newProjects.length > 0 && {
          allProjects: [...prev.allProjects, ...newProjects],
          currentPage: prev.currentPage + 1,
        })
      }));
    },
    onError: () => {
      setState(prev => ({
        ...prev,
        hasTriedLoadMore: true,
        noMoreProjects: true,
      }));
    }
  });

  const handleLoadMore = () => {
    if (!loadMoreMutation.isPending) {
      loadMoreMutation.mutate();
    }
  };

  const resetPagination = () => {
    setState({
      currentPage: 1,
      allProjects: [],
      noMoreProjects: false,
      hasTriedLoadMore: false,
    });
  };

  // Computed values for better UX
  const showLoadMoreButton = 
    state.allProjects.length > 0 && 
    !state.noMoreProjects;

  const showNoMoreMessage = 
    state.hasTriedLoadMore && 
    state.noMoreProjects && 
    state.allProjects.length > 0;

  return {
    // State
    activeTab,
    selectedCategory,
    projects: state.allProjects,
    isLoading,
    showLoadMoreButton,
    showNoMoreMessage,
    isLoadingMore: loadMoreMutation.isPending,
    
    // Actions
    setActiveTab,
    setSelectedCategory,
    handleLoadMore,
    resetPagination,
  };
}