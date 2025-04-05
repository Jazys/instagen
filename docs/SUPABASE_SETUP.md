# Supabase Setup for Image Generation System

## Services to Activate
1. **Supabase Auth**: For user authentication
2. **Supabase Database**: For storing generation metadata
3. **Supabase Storage**: For storing generated images

## Database Setup

### Create Generations Table

```sql
-- Create the generations table
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enhanced_prompt TEXT NOT NULL,
  enhanced_prompt_external TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Optional metadata fields
  width INTEGER DEFAULT 1024,
  height INTEGER DEFAULT 1024
);

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read only their own generations
CREATE POLICY "Users can view their own generations"
  ON public.generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own generations
CREATE POLICY "Users can insert their own generations"
  ON public.generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster querying by user_id
CREATE INDEX generations_user_id_idx ON public.generations (user_id);
```

## Storage Setup

### Create Storage Bucket

1. Go to Storage in the Supabase dashboard
2. Create a new bucket named `generated-images`
3. Set the bucket visibility to either:
   - Public (easier but less secure)
   - Private (more secure, will require signed URLs)

### Storage Bucket RLS Policies

If you choose a private bucket, add these policies:

```sql
-- Allow users to read from the generated-images bucket
CREATE POLICY "Users can view their own images"
  ON storage.objects
  FOR SELECT
  USING (
    auth.uid() = (storage.foldername(name))[1]::uuid 
    AND bucket_id = 'generated-images'
  );

-- Allow users to upload to the generated-images bucket
CREATE POLICY "Users can upload their own images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.uid() = (storage.foldername(name))[1]::uuid 
    AND bucket_id = 'generated-images'
  );
```

## Files Created or Updated

1. **Database**:
   - Created `generations` table with RLS policies

2. **Storage**:
   - Created `generated-images` bucket with RLS policies

3. **Components/Functions**:
   - Created `src/lib/supabase-storage.ts` - Helper functions for Supabase storage
   - Updated `src/pages/dashboard/generate.tsx` - Added image saving and gallery
   - Created `src/components/gallery/GenerationsGallery.tsx` - Gallery component
   - Created `src/components/customization/ImageCustomizer.tsx` - Customization interface

4. **API Routes**:
   - Updated `src/pages/api/generate-influ.ts` - Modified to save generations
   - Created `src/pages/api/customize-influ.ts` - For image customization

## Environment Variables Required

Make sure these are in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for server-side operations)
``` 