import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ornament } from "@/components/masjid/Ornament";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول الإدارة — مسجد عائشة أم المؤمنين أولاد هداج" },
      { name: "description", content: "صفحة دخول إدارة مسجد عائشة أم المؤمنين أولاد هداج لمتابعة طلبات التسجيل." },
      { property: "og:title", content: "دخول الإدارة — مسجد عائشة أم المؤمنين أولاد هداج" },
      { property: "og:description", content: "فضاء خاص بإدارة مسجد عائشة أم المؤمنين أولاد هداج." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("بيانات الدخول غير صحيحة");
      return;
    }
    navigate({ to: "/admin", replace: true });
  };

  const handleDirectAccess = () => {
    localStorage.setItem("direct_admin_access", "true");
    navigate({ to: "/admin", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <form
        onSubmit={submit}
        className="mihrab w-full max-w-md border border-primary/25 bg-card px-8 pb-10 pt-14 shadow-sm"
      >
        <h1 className="text-center text-3xl text-foreground">فضاء الإدارة</h1>
        <Ornament className="my-8" />
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جارٍ الدخول..." : "دخول"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full text-muted-foreground border-dashed"
            onClick={handleDirectAccess}
          >
            دخول مباشر بدون كلمة مرور
          </Button>
        </div>
      </form>
    </main>
  );
}
