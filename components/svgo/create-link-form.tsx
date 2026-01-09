// components/svgo/create-link-form.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLinkSchema, type CreateLinkInput } from '@/lib/validators/svgo/create-link.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { SuccessModal } from './success-modal';

export function CreateLinkForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    shortUrl: string;
    platform: string;
    label: string;
    code: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
  });

  const onSubmit = async (data: CreateLinkInput) => {
    setIsLoading(true);
    setStatus('Resolving URL...');

    try {
      setStatus('Detecting platform...');
      const response = await fetch('/api/svgo/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create link');
      }

      setStatus('Saving link...');
      const result = await response.json();
      
      setSuccessData(result);
      setStatus(null);
      reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create link');
      console.error('Error creating link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Affiliate URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://amzn.to/4jwjE3Z"
            {...register('url')}
            disabled={isLoading}
          />
          {errors.url && (
            <p className="text-sm text-destructive">{errors.url.message}</p>
          )}
        </div>

        {status && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {status}
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Link'
          )}
        </Button>
      </form>

      {successData && (
        <SuccessModal
          data={successData}
          onClose={() => setSuccessData(null)}
        />
      )}
    </>
  );
}



