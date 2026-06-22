import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavoriteButton({ propertyId, size = 'icon', variant = 'ghost', className = '' }) {
  const { isFavorite, toggleFavorite, isUpdating } = useFavorites();
  const active = isFavorite(propertyId);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={isUpdating}
      className={`${active ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'} ${className}`}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(propertyId);
      }}
    >
      <Star className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
    </Button>
  );
}
