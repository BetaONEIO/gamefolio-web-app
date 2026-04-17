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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Send, Mail, MessageSquare, Route } from "lucide-react";

type RoutingMode = "all" | "selected";

interface AlertRoutingRule {
  mode: RoutingMode;
  emails: string[];
  slackWebhooks: string[];
  includeEnv?: boolean;
}

interface AlertSettings {
  emailRecipients: string[];
  slackWebhooks: string[];
  useEnvFallback: boolean;
  routingRules: Record<string, AlertRoutingRule>;
  knownAlertTypes: string[];
  envEmail: string | null;
  envSlackWebhookConfigured: boolean;
  updatedAt: string | null;
}

function defaultRule(): AlertRoutingRule {
  return { mode: "all", emails: [], slackWebhooks: [] };
}

export function AlertSettings() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AlertSettings>({
    queryKey: ["/api/admin/alert-settings"],
  });

  const [emails, setEmails] = useState<string[]>([]);
  const [webhooks, setWebhooks] = useState<string[]>([]);
  const [useEnvFallback, setUseEnvFallback] = useState(true);
  const [routingRules, setRoutingRules] = useState<Record<string, AlertRoutingRule>>({});
  const [newEmail, setNewEmail] = useState("");
  const [newWebhook, setNewWebhook] = useState("");
  const [newType, setNewType] = useState("");

  useEffect(() => {
    if (data) {
      setEmails(data.emailRecipients);
      setWebhooks(data.slackWebhooks);
      setUseEnvFallback(data.useEnvFallback);
      setRoutingRules(data.routingRules || {});
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/alert-settings", {
        emailRecipients: emails,
        slackWebhooks: webhooks,
        useEnvFallback,
        routingRules,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alert-settings"] });
      toast({ title: "Saved", description: "Alert destinations and routing updated." });
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

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
    // Also strip it from any routing rule that referenced it.
    setRoutingRules((prev) => {
      const next: Record<string, AlertRoutingRule> = {};
      for (const [t, r] of Object.entries(prev)) {
        next[t] = { ...r, emails: (r.emails || []).filter((e) => e !== email) };
      }
      return next;
    });
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

  const removeWebhook = (url: string) => {
    setWebhooks(webhooks.filter((w) => w !== url));
    setRoutingRules((prev) => {
      const next: Record<string, AlertRoutingRule> = {};
      for (const [t, r] of Object.entries(prev)) {
        next[t] = { ...r, slackWebhooks: (r.slackWebhooks || []).filter((w) => w !== url) };
      }
      return next;
    });
  };

  const updateRule = (type: string, patch: Partial<AlertRoutingRule>) => {
    setRoutingRules((prev) => ({
      ...prev,
      [type]: { ...(prev[type] ?? defaultRule()), ...patch },
    }));
  };

  const removeRule = (type: string) => {
    setRoutingRules((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const addRule = (type: string) => {
    const t = type.trim().toLowerCase().replace(/\s+/g, "_");
    if (!t) return;
    if (routingRules[t]) {
      toast({ title: "Rule exists", description: `A rule for "${t}" already exists.`, variant: "destructive" });
      return;
    }
    setRoutingRules({ ...routingRules, [t]: defaultRule() });
    setNewType("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Alert Routing</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  const knownTypes = data?.knownAlertTypes ?? [];
  const ruleTypes = Object.keys(routingRules).sort();
  const suggestableTypes = knownTypes.filter((t) => !routingRules[t]);

  return (
    <Card data-testid="card-alert-settings">
      <CardHeader>
        <CardTitle>Admin Alert Routing</CardTitle>
        <CardDescription>
          Configure where admin alerts are delivered. Use the per-type rules below to send specific
          alert categories (e.g. <code>stuck_payment</code>, <code>moderation</code>) to a subset of
          destinations. Types without a rule fan out to every destination (legacy behavior).
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
                  onClick={() => removeEmail(email)}
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
                  onClick={() => removeWebhook(url)}
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
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <h4 className="font-semibold">Per-alert-type routing rules</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose how each alert type is delivered. <strong>All destinations</strong> sends to every
            email and Slack webhook above. <strong>Selected destinations</strong> restricts delivery
            to the boxes you tick.
          </p>

          <div className="space-y-3">
            {ruleTypes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No per-type rules yet — every alert fans out to all destinations.
              </p>
            )}
            {ruleTypes.map((type) => {
              const rule = routingRules[type];
              return (
                <div key={type} className="rounded-md border p-3 space-y-3" data-testid={`rule-${type}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{type}</Badge>
                      {knownTypes.includes(type) && (
                        <Badge variant="outline" className="text-xs">built-in</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={rule.mode}
                        onValueChange={(v) => updateRule(type, { mode: v as RoutingMode })}
                      >
                        <SelectTrigger className="w-[220px]" data-testid={`select-mode-${type}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All destinations</SelectItem>
                          <SelectItem value="selected">Selected destinations</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRule(type)}
                        data-testid={`button-remove-rule-${type}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {rule.mode === "selected" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Emails
                        </Label>
                        {emails.length === 0 && (
                          <p className="text-xs text-muted-foreground">Add emails above first.</p>
                        )}
                        {emails.map((email) => {
                          const checked = rule.emails.includes(email);
                          return (
                            <label key={email} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? [...rule.emails, email]
                                    : rule.emails.filter((e) => e !== email);
                                  updateRule(type, { emails: next });
                                }}
                                data-testid={`checkbox-email-${type}-${email}`}
                              />
                              <span className="truncate">{email}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Slack webhooks
                        </Label>
                        {webhooks.length === 0 && (
                          <p className="text-xs text-muted-foreground">Add webhooks above first.</p>
                        )}
                        {webhooks.map((url) => {
                          const checked = rule.slackWebhooks.includes(url);
                          return (
                            <label key={url} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? [...rule.slackWebhooks, url]
                                    : rule.slackWebhooks.filter((w) => w !== url);
                                  updateRule(type, { slackWebhooks: next });
                                }}
                                data-testid={`checkbox-webhook-${type}`}
                              />
                              <span className="truncate font-mono text-xs">{url}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={rule.includeEnv ?? useEnvFallback}
                      onCheckedChange={(v) => updateRule(type, { includeEnv: !!v })}
                      data-testid={`checkbox-includeenv-${type}`}
                    />
                    <span>
                      Also send this type to environment-variable destinations
                      <span className="text-xs text-muted-foreground"> (overrides global toggle below)</span>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {suggestableTypes.length > 0 ? (
              <Select value="" onValueChange={(v) => addRule(v)}>
                <SelectTrigger className="w-[260px]" data-testid="select-add-known-type">
                  <SelectValue placeholder="Add rule for built-in type..." />
                </SelectTrigger>
                <SelectContent>
                  {suggestableTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Input
              placeholder="custom_alert_type"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule(newType);
                }
              }}
              data-testid="input-new-type"
            />
            <Button type="button" onClick={() => addRule(newType)} data-testid="button-add-rule">
              <Plus className="h-4 w-4 mr-1" /> Add rule
            </Button>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="env-fallback" className="font-semibold">
                Also send to environment-variable destinations (default)
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, alerts are also sent to <code>ADMIN_ALERT_EMAIL</code> and{" "}
                <code>ADMIN_ALERT_SLACK_WEBHOOK_URL</code>. When disabled, only the recipients above are used. If
                no recipients are configured, env destinations are always used regardless of this setting.
                Per-type rules can override this with their own checkbox.
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
