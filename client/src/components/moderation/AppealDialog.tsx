import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AppealDialogProps {
  contentType: 'clip' | 'reel' | 'screenshot' | 'avatar';
  contentId: number;
  trigger: ReactNode;
}

export function AppealDialog({ contentType, contentId, trigger }: AppealDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const appeal = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/moderation/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to submit appeal');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Appeal submitted', description: 'A moderator will review your appeal shortly.' });
      setMessage("");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appeal moderation decision</DialogTitle>
          <DialogDescription>
            Explain why you believe this content was flagged or removed by mistake. A human moderator
            will review your appeal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="appeal-message">Why should this be approved?</Label>
          <Textarea
            id="appeal-message"
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="This is gameplay from a shooter game and the violence is part of the gameplay…"
          />
          <p className="text-xs text-muted-foreground">{message.length} / 2000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => appeal.mutate()}
            disabled={!message.trim() || appeal.isPending}
          >
            {appeal.isPending ? 'Submitting…' : 'Submit appeal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
