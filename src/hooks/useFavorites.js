import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

async function listUserFavorites(userId) {
  if (!userId) return [];

  try {
    return await base44.entities.Favorite.filter({ created_by_id: userId }, '-created_date', 200);
  } catch (error) {
    console.warn('[Favorites] created_by_id filter unavailable, falling back to list:', error);
    const favorites = await base44.entities.Favorite.list('-created_date', 200);
    return favorites.filter((favorite) => !favorite.created_by_id || favorite.created_by_id === userId);
  }
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['favorites', user?.id];

  const favoritesQuery = useQuery({
    queryKey,
    queryFn: () => listUserFavorites(user?.id),
    enabled: !!user?.id,
  });

  const createFavorite = useMutation({
    mutationFn: async (propertyId) => {
      try {
        return await base44.entities.Favorite.create({
          property_id: propertyId,
          created_by_id: user?.id,
        });
      } catch (error) {
        console.warn('[Favorites] created_by_id insert unavailable, retrying without it:', error);
        return base44.entities.Favorite.create({ property_id: propertyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const deleteFavorite = useMutation({
    mutationFn: (favoriteId) => base44.entities.Favorite.delete(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const favorites = favoritesQuery.data || [];

  const getFavorite = (propertyId) =>
    favorites.find((favorite) => favorite.property_id === propertyId);

  const isFavorite = (propertyId) => Boolean(getFavorite(propertyId));

  const toggleFavorite = (propertyId) => {
    const existing = getFavorite(propertyId);
    if (existing) {
      deleteFavorite.mutate(existing.id);
      return;
    }

    createFavorite.mutate(propertyId);
  };

  return {
    favorites,
    favoritePropertyIds: favorites.map((favorite) => favorite.property_id),
    getFavorite,
    isFavorite,
    toggleFavorite,
    isLoading: favoritesQuery.isLoading,
    isUpdating: createFavorite.isPending || deleteFavorite.isPending,
  };
}
