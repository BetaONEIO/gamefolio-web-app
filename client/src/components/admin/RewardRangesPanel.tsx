import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface RewardConfig {
  dailyXpMin: number;
  dailyXpMax: number;
  dailyGftMin: number;
  dailyGftMax: number;
  weeklyXpMin: number;
  weeklyXpMax: number;
  weeklyGftMin: number;
  weeklyGftMax: number;
  proMultiplier: number;
}

const QUERY_KEY = ["/api/admin/rewards/config"] as const;

function Field({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  step?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={step ?? "1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`input-${id}`}
      />
    </div>
  );
}

export function RewardRangesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<RewardConfig>({
    queryKey: QUERY_KEY,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [form, setForm] = useState<Record<keyof RewardConfig, string>>({
    dailyXpMin: "",
    dailyXpMax: "",
    dailyGftMin: "",
    dailyGftMax: "",
    weeklyXpMin: "",
    weeklyXpMax: "",
    weeklyGftMin: "",
    weeklyGftMax: "",
    proMultiplier: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      dailyXpMin: String(data.dailyXpMin),
      dailyXpMax: String(data.dailyXpMax),
      dailyGftMin: String(data.dailyGftMin),
      dailyGftMax: String(data.dailyGftMax),
      weeklyXpMin: String(data.weeklyXpMin),
      weeklyXpMax: String(data.weeklyXpMax),
      weeklyGftMin: String(data.weeklyGftMin),
      weeklyGftMax: String(data.weeklyGftMax),
      proMultiplier: String(data.proMultiplier),
    });
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<RewardConfig> = {};
      for (const key of Object.keys(form) as (keyof RewardConfig)[]) {
        const n = Number(form[key]);
        if (!Number.isFinite(n) || n < 0) {
          toast({
            title: "Invalid value",
            description: `${key} must be a non-negative number.`,
            variant: "destructive" as any,
          });
          setSaving(false);
          return;
        }
        payload[key] = n;
      }
      const res = await apiRequest("PATCH", "/api/admin/rewards/config", payload);
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Saved", description: "Reward ranges updated." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message ?? "Could not save reward config.",
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof RewardConfig) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Daily / Weekly Reward Ranges
        </CardTitle>
        <CardDescription>
          Each user is issued one reward per period with a random amount inside these ranges.
          Pro users get amount × multiplier. Unclaimed rewards expire at the end of the period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (
          <>
            <div>
              <h4 className="text-sm font-semibold mb-3">Daily</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field id="dailyXpMin" label="XP min" value={form.dailyXpMin} onChange={set("dailyXpMin")} />
                <Field id="dailyXpMax" label="XP max" value={form.dailyXpMax} onChange={set("dailyXpMax")} />
                <Field id="dailyGftMin" label="GFT min" step="0.01" value={form.dailyGftMin} onChange={set("dailyGftMin")} />
                <Field id="dailyGftMax" label="GFT max" step="0.01" value={form.dailyGftMax} onChange={set("dailyGftMax")} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Weekly</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field id="weeklyXpMin" label="XP min" value={form.weeklyXpMin} onChange={set("weeklyXpMin")} />
                <Field id="weeklyXpMax" label="XP max" value={form.weeklyXpMax} onChange={set("weeklyXpMax")} />
                <Field id="weeklyGftMin" label="GFT min" step="0.01" value={form.weeklyGftMin} onChange={set("weeklyGftMin")} />
                <Field id="weeklyGftMax" label="GFT max" step="0.01" value={form.weeklyGftMax} onChange={set("weeklyGftMax")} />
              </div>
            </div>

            <div className="max-w-xs">
              <Field
                id="proMultiplier"
                label="Pro multiplier"
                step="0.1"
                value={form.proMultiplier}
                onChange={set("proMultiplier")}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} data-testid="button-save-reward-config">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving…" : "Save ranges"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default RewardRangesPanel;
