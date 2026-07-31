import { supabase } from '@/api/supabaseClient';

export const parseDocuments = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const uploadPropertyFiles = async (files) => {
  const maxSize = 20 * 1024 * 1024;
  const oversized = files.find((f) => f.size > maxSize);
  if (oversized) {
    throw new Error(`Le fichier « ${oversized.name} » ne doit pas dépasser 20 Mo`);
  }

  const uploaded = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const fileName = `docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('property-files')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-files')
      .getPublicUrl(fileName);

    uploaded.push({ name: file.name, url: publicUrl });
  }
  return uploaded;
};

export const uploadPropertyImages = async (files) => {
  const maxSize = 20 * 1024 * 1024;
  const oversized = files.find((f) => f.size > maxSize);
  if (oversized) {
    throw new Error(`La photo « ${oversized.name} » ne doit pas dépasser 20 Mo`);
  }

  const uploaded = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('property-files')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-files')
      .getPublicUrl(fileName);

    uploaded.push({ name: file.name, url: publicUrl });
  }
  return uploaded;
};
