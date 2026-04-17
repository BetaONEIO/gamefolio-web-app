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
import { Trash2, Plus, Send, Mail, MessageSquare, Smartphone, Siren, Route, Zap, CheckCircle2, XCircle } from "lucide-react";

type RoutingMode = "all" | "selected";

interface AlertRoutingRule {
  mode: RoutingMode;
  emails: string[];
  slackWebhooks: string[];
  smsNumbers: string[];
  includePagerDuty?: boolean;
  includeEnv?: boolean;
}

interface AlertSettings {
  emailRecipients: string[];
  slackWebhooks: string[];
  smsNumbers: string[];
  pagerDutyRoutingKey: string | null;
  useEnvFallback: boolean;
  routingRules: Record<string, AlertRoutingRule>;
  knownAlertTypes: string[];
  envEmail: string | null;
  envSlackWebhookConfigured: boolean;
  envPagerDutyRoutingKeyConfigured: boolean;
  twilioConfigured: boolean;
  updatedAt: string | null;
}

function defaultRule(): AlertRoutingRule {
  return { mode: "all", emails: [], slackWebhooks: [], smsNumbers: [] };
}

type Channel = "email" | "slack" | "sms" | "pagerduty";

export function AlertSettings() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AlertSettings>({
    queryKey: ["/api/admin/alert-settings"],
  });

  const [emails, setEmails] = useState<string[]>([]);
  const [webhooks, setWebhooks] = useState<string[]>([]);
  const [smsNumbers, setSmsNumbers] = useState<string[]>([]);
  const [pagerDutyKey, setPagerDutyKey] = useState<string>("");
  const [useEnvFallback, setUseEnvFallback] = useState(true);
  const [routingRules, setRoutingRules] = useState<Record<string, AlertRoutingRule>>({});
  const [newEmail, setNewEmail] = useState("");
  const [newWebhook, setNewWebhook] = useState("");
  const [newType, setNewType] = useState("");
  const [newSms, setNewSms] = useState("");
  const [routedTestType, setRoutedTestType] = useState<string>("");
  const [lastRoutedTest, setLastRoutedTest] = useState<{
    alertType: string;
    destinations: {
      emails: { target: string; ok: boolean }[];
      slackWebhooks: { target: string; ok: boolean }[];
      smsNumbers: { target: string; ok: boolean }[];
      pagerDuty: { target: string; ok: boolean }[];
    };
  } | null>(null);

  useEffect(() => {
    if (data) {
      setEmails(data.emailRecipients);
      setWebhooks(data.slackWebhooks);
      setSmsNumbers(data.smsNumbers || []);
      setPagerDutyKey(data.pagerDutyRoutingKey || "");
      setUseEnvFallback(data.useEnvFallback);
      setRoutingRules(data.routingRules || {});
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/alert-settings", {
        emailRecipients: emails,
        slackWebhooks: webhooks,
        smsNumbers,
        pagerDutyRoutingKey: pagerDutyKey.trim() === "" ? null : pagerDutyKey.trim(),
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
    mutationFn: async (vars: { channel: Channel; target: string }) => {
      const res = await apiRequest("POST", "/api/admin/alert-settings/test", vars);
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: (result, vars) => {
      const where =
        vars.channel === "email"
          ? vars.target
          : vars.channel === "slack"
            ? "your Slack channel"
            : vars.channel === "sms"
              ? vars.target
              : "your PagerDuty service";
      toast({
        title: result.success ? "Test sent" : "Test failed",
        description: result.success
          ? `Check ${where} for the alert.`
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

  const routedTestMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", "/api/admin/alert-settings/test-routed", { type });
      return res.json() as Promise<{
        success: boolean;
        alertType: string;
        suppressed: boolean;
        matchedCount: number;
        successCount: number;
        destinations: {
          emails: { target: string; ok: boolean }[];
          slackWebhooks: { target: string; ok: boolean }[];
          smsNumbers: { target: string; ok: boolean }[];
          pagerDuty: { target: string; ok: boolean }[];
        };
      }>;
    },
    onSuccess: (result) => {
      setLastRoutedTest({ alertType: result.alertType, destinations: result.destinations });
      if (result.matchedCount === 0) {
        toast({
          title: "No destinations matched",
          description: `Routing rules for "${result.alertType}" produced no destinations.`,
          variant: "destructive",
        });
      } else if (result.successCount === 0) {
        toast({
          title: "All deliveries failed",
          description: `Matched ${result.matchedCount} destination(s) for "${result.alertType}", but none accepted the alert.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Routed test sent",
          description: `Delivered "${result.alertType}" to ${result.successCount}/${result.matchedCount} destination(s).`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Routed test failed",
        description: err?.message || "Could not send routed test alert",
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

  const addSms = () => {
    const v = newSms.trim();
    if (!v) return;
    if (!/^\+[1-9]\d{6,14}$/.test(v)) {
      toast({
        title: "Invalid number",
        description: "SMS numbers must be in E.164 format, e.g. +14155551234",
        variant: "destructive",
      });
      return;
    }
    if (smsNumbers.includes(v)) {
      toast({ title: "Already added", description: v, variant: "destructive" });
      return;
    }
    setSmsNumbers([...smsNumbers, v]);
    setNewSms("");
  };

  const removeSms = (n: string) => {
    setSmsNumbers(smsNumbers.filter((x) => x !== n));
    setRoutingRules((prev) => {
      const next: Record<string, AlertRoutingRule> = {};
      for (const [t, r] of Object.entries(prev)) {
        next[t] = { ...r, smsNumbers: (r.smsNumbers || []).filter((x) => x !== n) };
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
  const routedTestTypes = Array.from(new Set([...knownTypes, ...Object.keys(routingRules)])).sort();

  return (
    <Card data-testid="card-alert-settings">
      <CardHeader>
        <CardTitle>Admin Alert Routing</CardTitle>
        <CardDescription>
          Configure where admin alerts are delivered. Email and Slack provide awareness; SMS (Twilio) and
          PagerDuty page on-call admins for urgent response. Use the per-type rules below to send specific
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

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <h4 className="font-semibold">SMS numbers (Twilio)</h4>
            {data && !data.twilioConfigured && (
              <Badge variant="outline" className="text-xs">
                Twilio env vars not set — sends will be skipped
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Pages on-call admins via SMS for urgent stuck-payment alerts. Numbers must be in E.164 format (e.g.{" "}
            <code>+14155551234</code>). Requires <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and{" "}
            <code>TWILIO_FROM_NUMBER</code> env secrets.
          </p>
          <div className="space-y-2">
            {smsNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground">No SMS numbers configured.</p>
            )}
            {smsNumbers.map((n) => (
              <div key={n} className="flex items-center gap-2" data-testid={`row-sms-${n}`}>
                <Input value={n} readOnly className="flex-1 font-mono text-xs" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate({ channel: "sms", target: n })}
                  disabled={testMutation.isPending || (data && !data.twilioConfigured)}
                  data-testid={`button-test-sms-${n}`}
                >
                  <Send className="h-4 w-4 mr-1" /> Test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSms(n)}
                  data-testid={`button-remove-sms-${n}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="tel"
              placeholder="+14155551234"
              value={newSms}
              onChange={(e) => setNewSms(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSms();
                }
              }}
              data-testid="input-new-sms"
            />
            <Button type="button" onClick={addSms} data-testid="button-add-sms">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4" />
            <h4 className="font-semibold">PagerDuty Events v2 routing key</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Triggers a PagerDuty incident for urgent stuck-payment alerts. Paste the integration routing key from your
            service's Events API v2 integration. The alert dedupe key is reused so repeated alerts roll up into the
            same incident.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="32-character integration routing key"
              value={pagerDutyKey}
              onChange={(e) => setPagerDutyKey(e.target.value)}
              data-testid="input-pagerduty-key"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                testMutation.mutate({ channel: "pagerduty", target: pagerDutyKey.trim() })
              }
              disabled={testMutation.isPending || pagerDutyKey.trim().length === 0}
              data-testid="button-test-pagerduty"
            >
              <Send className="h-4 w-4 mr-1" /> Test
            </Button>
          </div>
          {data?.envPagerDutyRoutingKeyConfigured && (
            <Badge variant="outline" data-testid="badge-env-pagerduty" className="text-xs">
              PAGERDUTY_ROUTING_KEY env fallback is configured
            </Badge>
          )}
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
                    <>
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
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            SMS numbers
                          </Label>
                          {smsNumbers.length === 0 && (
                            <p className="text-xs text-muted-foreground">Add SMS numbers above first.</p>
                          )}
                          {smsNumbers.map((n) => {
                            const checked = (rule.smsNumbers || []).includes(n);
                            return (
                              <label key={n} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const cur = rule.smsNumbers || [];
                                    const next = v ? [...cur, n] : cur.filter((x) => x !== n);
                                    updateRule(type, { smsNumbers: next });
                                  }}
                                  data-testid={`checkbox-sms-${type}-${n}`}
                                />
                                <span className="truncate font-mono text-xs">{n}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            PagerDuty
                          </Label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={!!rule.includePagerDuty}
                              onCheckedChange={(v) => updateRule(type, { includePagerDuty: !!v })}
                              disabled={!pagerDutyKey.trim()}
                              data-testid={`checkbox-pagerduty-${type}`}
                            />
                            <span>
                              Also page PagerDuty for this alert type
                              {!pagerDutyKey.trim() && (
                                <span className="text-xs text-muted-foreground"> (configure routing key above)</span>
                              )}
                            </span>
                          </label>
                        </div>
                      </div>
                    </>
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

        <section className="space-y-3 border-t pt-4" data-testid="section-routed-test">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <h4 className="font-semibold">Send test alert (routed)</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Fire a real <code>sendAdminAlert</code> for the chosen type so per-type routing rules
            are exercised end-to-end. Unlike the per-destination Test buttons above, this respects
            your rules and reports which destinations actually received it.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={routedTestType} onValueChange={setRoutedTestType}>
              <SelectTrigger className="w-[260px]" data-testid="select-routed-test-type">
                <SelectValue placeholder="Choose alert type..." />
              </SelectTrigger>
              <SelectContent>
                {routedTestTypes.length === 0 && (
                  <SelectItem value="general">general</SelectItem>
                )}
                {routedTestTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                    {knownTypes.includes(t) ? " (built-in)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="or type a custom type"
              value={routedTestType}
              onChange={(e) => setRoutedTestType(e.target.value)}
              className="w-[220px]"
              data-testid="input-routed-test-type"
            />
            <Button
              type="button"
              onClick={() => {
                const t = routedTestType.trim().toLowerCase().replace(/\s+/g, "_");
                if (!t) {
                  toast({
                    title: "Pick a type",
                    description: "Select or enter an alert type to test.",
                    variant: "destructive",
                  });
                  return;
                }
                setLastRoutedTest(null);
                routedTestMutation.mutate(t);
              }}
              disabled={routedTestMutation.isPending}
              data-testid="button-send-routed-test"
            >
              <Send className="h-4 w-4 mr-1" />
              {routedTestMutation.isPending ? "Sending..." : "Send test alert"}
            </Button>
          </div>

          {lastRoutedTest && (
            <div className="rounded-md border p-3 space-y-2" data-testid="routed-test-result">
              <div className="text-sm">
                Last test for <Badge variant="secondary">{lastRoutedTest.alertType}</Badge>{" "}
                reached{" "}
                {lastRoutedTest.destinations.emails.length +
                  lastRoutedTest.destinations.slackWebhooks.length +
                  lastRoutedTest.destinations.smsNumbers.length +
                  lastRoutedTest.destinations.pagerDuty.length}{" "}
                destination(s):
              </div>
              {lastRoutedTest.destinations.emails.length === 0 &&
                lastRoutedTest.destinations.slackWebhooks.length === 0 &&
                lastRoutedTest.destinations.smsNumbers.length === 0 &&
                lastRoutedTest.destinations.pagerDuty.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No destinations matched these routing rules.
                  </p>
                )}
              {lastRoutedTest.destinations.emails.map((d) => (
                <div
                  key={`email-${d.target}`}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`routed-test-email-${d.target}`}
                >
                  {d.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{d.target}</span>
                </div>
              ))}
              {lastRoutedTest.destinations.slackWebhooks.map((d) => (
                <div
                  key={`slack-${d.target}`}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`routed-test-slack-${d.target}`}
                >
                  {d.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate font-mono text-xs">{d.target}</span>
                </div>
              ))}
              {lastRoutedTest.destinations.smsNumbers.map((d) => (
                <div
                  key={`sms-${d.target}`}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`routed-test-sms-${d.target}`}
                >
                  {d.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Smartphone className="h-4 w-4" />
                  <span className="truncate font-mono text-xs">{d.target}</span>
                </div>
              ))}
              {lastRoutedTest.destinations.pagerDuty.map((d) => (
                <div
                  key={`pagerduty-${d.target}`}
                  className="flex items-center gap-2 text-sm"
                  data-testid="routed-test-pagerduty"
                >
                  {d.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Siren className="h-4 w-4" />
                  <span className="truncate font-mono text-xs">PagerDuty</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="env-fallback" className="font-semibold">
                Also send to environment-variable destinations (default)
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, alerts are also sent to <code>ADMIN_ALERT_EMAIL</code>,{" "}
                <code>ADMIN_ALERT_SLACK_WEBHOOK_URL</code>, and the <code>PAGERDUTY_ROUTING_KEY</code> env fallback
                (when no key is set above). When disabled, only the destinations above are used. If no destinations
                are configured at all, env fallbacks are always used regardless of this setting.
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
