import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, RefreshCw, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function OutroPanel() {
  const { toast } = useToast();

  const { data: outroData, isLoading } = useQuery<{ url: string | null }>({
    queryKey: ['/api/users/me/outro'],
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/users/me/outro'),
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/users/me/outro'] });
      toast({ title: 'Outro generated!', description: 'It will now be appended to your clip downloads.' });
    },
    onError: () => {
      toast({
        title: 'Generation failed',
        description: 'Could not generate your outro. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const hasOutro = !!outroData?.url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-5 w-5 text-primary" />
          Outro Video
        </CardTitle>
        <CardDescription>
          Auto-appended to every clip you download — TikTok style
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : hasOutro ? (
          <video
            key={outroData.url!}
            src={outroData.url!}
            className="w-full rounded-lg aspect-video bg-black"
            controls
            muted
            playsInline
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No outro yet. Generate one and it will be appended whenever you download your own clips.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            size="sm"
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {hasOutro ? 'Regenerate Outro' : 'Generate Outro'}
          </Button>

          {hasOutro && (
            <a
              href={outroData.url!}
              download="gamefolio_outro.mp4"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
          )}
        </div>

        {generateMutation.isPending && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Rendering your outro… this takes about 30 seconds
          </p>
        )}
      </CardContent>
    </Card>
  );
}
