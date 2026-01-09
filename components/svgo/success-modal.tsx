// components/svgo/success-modal.tsx

'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface SuccessModalProps {
  data: {
    shortUrl: string;
    platform: string;
    label: string;
    code: string;
  };
  onClose: () => void;
}

export function SuccessModal({ data, onClose }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Created!</DialogTitle>
          <DialogDescription>
            Your short link is ready to share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Short Link</Label>
            <div className="flex gap-2">
              <Input
                value={data.shortUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">Copied to clipboard!</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Details</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Platform:</span>
                <Badge variant="secondary">{data.platform}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Label:</span>
                <span className="text-sm">{data.label}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Create Another
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                window.open(data.shortUrl, '_blank');
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Test Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

