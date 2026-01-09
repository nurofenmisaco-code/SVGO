// components/svgo/link-list.tsx

'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface Link {
  id: string;
  code: string;
  platform: string;
  label: string | null;
  originalUrl: string;
  resolvedUrl: string;
  createdAt: string;
  tags: string[];
  merchantProductId: string | null;
  _count?: {
    dailyClicks: number;
  };
}

interface LinkListProps {
  initialLinks: Link[];
}

async function fetchLinks(): Promise<Link[]> {
  const response = await fetch('/api/svgo/links');
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch links' }));
    throw new Error(error.error || 'Failed to fetch links');
  }
  return response.json();
}

export function LinkList({ initialLinks }: LinkListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: links = initialLinks } = useQuery({
    queryKey: ['svgo-links'],
    queryFn: fetchLinks,
    initialData: initialLinks,
    refetchOnWindowFocus: true,
  });

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return links;

    const query = searchQuery.toLowerCase();
    return links.filter((link) => {
      const labelMatch = link.label?.toLowerCase().includes(query);
      const codeMatch = link.code.toLowerCase().includes(query);
      const tagMatch = link.tags.some((tag) => tag.toLowerCase().includes(query));
      const productIdMatch = link.merchantProductId?.toLowerCase().includes(query);
      const urlMatch = link.originalUrl.toLowerCase().includes(query) ||
                      link.resolvedUrl.toLowerCase().includes(query);

      return labelMatch || codeMatch || tagMatch || productIdMatch || urlMatch;
    });
  }, [links, searchQuery]);

  const copyToClipboard = async (shortUrl: string, code: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getShortUrl = (code: string) => {
    return `${process.env.NEXT_PUBLIC_APP_URL || 'https://svgo.to'}/${code}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by label, code, tags, or URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredLinks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No links found matching your search.' : 'No links yet. Create your first link!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLinks.map((link) => {
            const shortUrl = getShortUrl(link.code);
            const isCopied = copiedCode === link.code;

            return (
              <div
                key={link.id}
                className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary">
                        {shortUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(shortUrl, link.code)}
                      >
                        {isCopied ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{link.platform}</Badge>
                      {link.label && (
                        <span className="text-sm text-muted-foreground">
                          {link.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Created {format(new Date(link.createdAt), 'MMM d, yyyy')}
                      </span>
                      {link.merchantProductId && (
                        <span>ID: {link.merchantProductId}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(shortUrl, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



