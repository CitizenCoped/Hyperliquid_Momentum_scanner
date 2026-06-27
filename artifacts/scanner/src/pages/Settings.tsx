import { useGetSettings, useUpdateSettings, useTestPushover } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Save, Bell, Loader2 } from "lucide-react";
import { getStoredAdminToken, saveStoredAdminToken } from "@/lib/admin-token";

const settingsSchema = z.object({
  watchThreshold: z.coerce.number().min(0).max(100),
  activeSetupThreshold: z.coerce.number().min(0).max(100),
  aPlusThreshold: z.coerce.number().min(0).max(100),
  pushoverEnabled: z.boolean(),
  minAlertLevel: z.enum(["WATCH", "ACTIVE_SETUP", "A_PLUS_SETUP"]),
  scanIntervalSeconds: z.coerce.number().min(5).max(300),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const testPushover = useTestPushover();
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      watchThreshold: 50,
      activeSetupThreshold: 65,
      aPlusThreshold: 80,
      pushoverEnabled: false,
      minAlertLevel: "ACTIVE_SETUP",
      scanIntervalSeconds: 10,
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        watchThreshold: settings.watchThreshold,
        activeSetupThreshold: settings.activeSetupThreshold,
        aPlusThreshold: settings.aPlusThreshold,
        pushoverEnabled: settings.pushoverEnabled,
        minAlertLevel: settings.minAlertLevel as any,
        scanIntervalSeconds: settings.scanIntervalSeconds,
      });
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsFormValues) => {
    saveStoredAdminToken(adminToken);
    updateSettings.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Settings Saved",
          description: "Scanner settings have been updated.",
        });
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: "Failed to save settings.",
          variant: "destructive",
        });
      }
    });
  };

  const handleTestNotification = () => {
    saveStoredAdminToken(adminToken);
    testPushover.mutate(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast({
            title: "Test Sent",
            description: "Pushover notification sent successfully.",
          });
        } else {
          toast({
            title: "Test Failed",
            description: res.message || "Failed to send test notification.",
            variant: "destructive",
          });
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to connect to Pushover API.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground font-mono">LOADING SETTINGS...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground mb-8 border-b border-border pb-4">Scanner Configuration</h1>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-8">
          <div>
            <Label htmlFor="admin-token" className="text-sm font-bold text-primary uppercase tracking-widest">
              Admin Write Token
            </Label>
            <p className="text-sm text-muted-foreground mt-2">
              Required for saving settings, dismissing alerts, and sending test notifications. This token is stored only in this browser.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="admin-token"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Enter SCANNER_WRITE_TOKEN"
              autoComplete="off"
              className="font-mono bg-background"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                saveStoredAdminToken(adminToken);
                toast({
                  title: "Admin Token Saved",
                  description: adminToken.trim()
                    ? "Protected API actions will include this token."
                    : "Admin token cleared from this browser.",
                });
              }}
            >
              Save Token
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                Score Thresholds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="watchThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(217,91%,60%)] font-bold">WATCH (Blue)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="font-mono bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activeSetupThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(35,100%,55%)] font-bold">ACTIVE (Orange)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="font-mono bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aPlusThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[hsl(280,85%,65%)] font-bold">A+ SETUP (Purple)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="font-mono bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  Push Notifications
                </h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestNotification}
                  disabled={testPushover.isPending || !form.watch("pushoverEnabled")}
                  className="font-mono text-xs"
                >
                  {testPushover.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                  Test Notification
                </Button>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="pushoverEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-background p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Pushover Alerts</FormLabel>
                        <FormDescription>
                          Send alerts to your phone via Pushover API.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minAlertLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Alert Level for Push</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WATCH">WATCH and above</SelectItem>
                          <SelectItem value="ACTIVE_SETUP">ACTIVE and above</SelectItem>
                          <SelectItem value="A_PLUS_SETUP">A+ SETUP only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only setups meeting this level will trigger a push notification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                Engine Settings
              </h2>
              <FormField
                control={form.control}
                name="scanIntervalSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scan Interval (Seconds)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="font-mono bg-background max-w-[200px]" />
                    </FormControl>
                    <FormDescription>
                      How often the backend engine scans the market. Lower means faster alerts but more API usage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                disabled={updateSettings.isPending}
                className="font-bold tracking-widest uppercase px-8"
              >
                {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Configuration
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}
