import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, Mail, MessageSquare } from "lucide-react";

interface AlertSettings {
  emailRecipients: string[];
  slackWebhooks: string[];
  useEnvFallback: boolean;
  envEmail: string | null;
  envSlackWebhookConfigured: boolean;
  updatedAt: string | null;
}

export function AlertSettings() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AlertSettings>({
    queryKey: ["/api/admin/alert-settings"],
  });

  const [emails, setEmails] = useState<string[]>([]);
  const [webhooks, setWebhooks] = useState<string[]>([]);
  const [useEnvFallback, setUseEnvFallback] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newWebhook, setNewWebhook] = useState("");

  useEffect(() => {
    if (data) {
      setEmails(data.emailRecipients);
      setWebhooks(data.slackWebhooks);
      setUseEnvFallback(data.useEnvFallback);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/alert-settings", {
        emailRecipients: emails,
        slackWebhooks: webhooks,
        useEnvFallback,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alert-settings"] });
      toast({ title: "Saved", description: "Alert destinations updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save alert settings",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (vars: { channel: "email" | "slack"; target: string }) => {
      const res = await apiRequest("POST", "/api/admin/alert-settings/test", vars);
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: (result, vars) => {
      toast({
        title: result.success ? "Test sent" : "Test failed",
        description: result.success
          ? `Check ${vars.channel === "email" ? vars.target : "your Slack channel"} for the message.`
          : "Destination did not accept the test alert. See server logs.",
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Test failed",
        description: err?.message || "Could not send test alert",
        variant: "destructive",
      });
    },
  });

  const addEmail = () => {
    const v = newEmail.trim();
    if (!v) return;
    if (emails.includes(v)) {
      toast({ title: "Already added", description: v, variant: "destructive" });
      return;
    }
    setEmails([...emails, v]);
    setNewEmail("");
  };

  const addWebhook = () => {
    const v = newWebhook.trim();
    if (!v) return;
    if (webhooks.includes(v)) {
      toast({ title: "Already added", description: "Webhook already in list", variant: "destructive" });
      return;
    }
    setWebhooks([...webhooks, v]);
    setNewWebhook("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stuck-payment Alert Routing</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-alert-settings">
      <CardHeader>
        <CardTitle>Stuck-payment Alert Routing</CardTitle>
        <CardDescription>
          Configure where admin alerts (e.g. stuck payments) are delivered. These destinations are used by{" "}
          <code>sendAdminAlert</code> in addition to (or instead of) the legacy environment-variable destinations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <h4 className="font-semibold">Email recipients</h4>
          </div>
          <div className="space-y-2">
            {emails.length === 0 && (
              <p className="text-sm text-muted-foreground">No email recipients configured.</p>
            )}
            {emails.map((email) => (
              <div key={email} className="flex items-center gap-2" data-testid={`row-email-${email}`}>
                <Input value={email} readOnly className="flex-1" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate({ channel: "email", target: email })}
                  disabled={testMutation.isPending}
                  data-testid={`button-test-email-${email}`}
                >
                  <Send className="h-4 w-4 mr-1" /> Test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEmails(emails.filter((e) => e !== email))}
                  data-testid={`button-remove-email-${email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="ops@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              data-testid="input-new-email"
            />
            <Button type="button" onClick={addEmail} data-testid="button-add-email">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <h4 className="font-semibold">Slack webhooks</h4>
          </div>
          <div className="space-y-2">
            {webhooks.length === 0 && (
              <p className="text-sm text-muted-foreground">No Slack webhooks configured.</p>
            )}
            {webhooks.map((url) => (
              <div key={url} className="flex items-center gap-2" data-testid={`row-webhook-${url}`}>
                <Input value={url} readOnly className="flex-1 font-mono text-xs" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate({ channel: "slack", target: url })}
                  disabled={testMutation.isPending}
                  data-testid="button-test-webhook"
                >
                  <Send className="h-4 w-4 mr-1" /> Test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setWebhooks(webhooks.filter((w) => w !== url))}
                  data-testid="button-remove-webhook"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://hooks.slack.com/services/..."
              value={newWebhook}
              onChange={(e) => setNewWebhook(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWebhook();
                }
              }}
              data-testid="input-new-webhook"
            />
            <Button type="button" onClick={addWebhook} data-testid="button-add-webhook">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="env-fallback" className="font-semibold">
                Also send to environment-variable destinations
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, alerts are also sent to <code>ADMIN_ALERT_EMAIL</code> and{" "}
                <code>ADMIN_ALERT_SLACK_WEBHOOK_URL</code>. When disabled, only the recipients above are used. If
                no recipients are configured, env destinations are always used regardless of this setting.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" data-testid="badge-env-email">
                  ADMIN_ALERT_EMAIL: {data?.envEmail ? data.envEmail : "not set"}
                </Badge>
                <Badge variant="outline" data-testid="badge-env-slack">
                  ADMIN_ALERT_SLACK_WEBHOOK_URL: {data?.envSlackWebhookConfigured ? "configured" : "not set"}
                </Badge>
              </div>
            </div>
            <Switch
              id="env-fallback"
              checked={useEnvFallback}
              onCheckedChange={setUseEnvFallback}
              data-testid="switch-env-fallback"
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-alert-settings"
          >
            {saveMutation.isPending ? "Saving..." : "Save destinations"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
