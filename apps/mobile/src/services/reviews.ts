import { supabase } from '../lib/supabase';

export type ReviewStats = { average: number; count: number };

export async function getReviewStats(restaurantId: string): Promise<ReviewStats | null> {
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);

  if (!data?.length) return null;
  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { average: avg, count: data.length };
}

export async function getUserReview(restaurantId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('reviews')
    .select('rating, comment')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', user.id)
    .maybeSingle();

  return data ?? null;
}

export async function upsertReview(restaurantId: string, rating: number, comment: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Ei kirjautunut');

  const { error } = await supabase.from('reviews').upsert(
    {
      restaurant_id: restaurantId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    },
    { onConflict: 'restaurant_id,user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteUserReview(restaurantId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Ei kirjautunut');

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('restaurant_id', restaurantId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}
