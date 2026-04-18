import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TestBody {
  email?: string | null;
  full_name?: string | null;
  password?: string | null;
}

type StepStatus = "ok" | "fail" | "warn" | "skip";

interface StepResult {
  step: string;
  status: StepStatus;
  duration_ms: number;
  detail?: string;
  data?: Record<string, unknown> | null;
}

interface TestReport {
  ok: boolean;
  email: string;
  user_id: string | null;
  total_duration_ms: number;
  steps: StepResult[];
  cleanup_done: boolean;
}

const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 5000;

function makePassword(): string {
  // 24 random bytes → base64 → strip non-url-safe → leaves >24 chars of entropy.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64").replace(/[^A-Za-z0-9]/g, "") + "Aa1!";
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: TestBody;
  try {
    body = (await request.json()) as TestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const fullName = (body.full_name || "Reg Test").trim().slice(0, 80);
  const password = body.password?.trim() || makePassword();

  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json(
      { error: "Provide a valid email in body" },
      { status: 400 }
    );
  }
  if (email === caller.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Refusing to test against the calling admin email" },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const steps: StepResult[] = [];
  let createdUserId: string | null = null;
  let cleanupDone = false;
  let overallOk = true;

  const runStep = async <T>(
    name: string,
    fn: () => Promise<{ status: StepStatus; detail?: string; data?: T | null }>,
  ): Promise<{ status: StepStatus; data?: T | null }> => {
    const t0 = Date.now();
    try {
      const out = await fn();
      const duration = Date.now() - t0;
      steps.push({
        step: name,
        status: out.status,
        duration_ms: duration,
        detail: out.detail,
        data: (out.data ?? null) as Record<string, unknown> | null,
      });
      if (out.status === "fail") overallOk = false;
      return { status: out.status, data: out.data ?? null };
    } catch (e) {
      const duration = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({
        step: name,
        status: "fail",
        duration_ms: duration,
        detail: `exception: ${msg}`,
      });
      overallOk = false;
      return { status: "fail", data: null };
    }
  };

  // ---------- 1. Pre-check: email not already in auth.users ----------
  await runStep("precheck_auth_users_unique", async () => {
    for (let page = 1; page <= 5; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) {
        return {
          status: "fail" as StepStatus,
          detail: `auth.listUsers: ${error.message}`,
        };
      }
      const found = list.users.find(
        (u) => (u.email || "").toLowerCase() === email,
      );
      if (found) {
        return {
          status: "fail" as StepStatus,
          detail: `email already exists in auth.users (id=${found.id}). Удалите его через "Поиск юзера" и повторите тест.`,
        };
      }
      if (list.users.length < 1000) break;
    }
    return { status: "ok" as StepStatus };
  });

  if (!overallOk) {
    return NextResponse.json({
      ok: false,
      email,
      user_id: null,
      total_duration_ms: Date.now() - startedAt,
      steps,
      cleanup_done: false,
    } satisfies TestReport);
  }

  // ---------- 2. Pre-check: email not in deleted_accounts archive (v29 cooldown signal) ----------
  await runStep("precheck_deleted_archive", async () => {
    const { data, error } = await admin
      .from("deleted_accounts")
      .select("id, deleted_at")
      .ilike("email", email);
    if (error) {
      // table may not exist on very old envs — warn instead of fail
      return {
        status: "warn" as StepStatus,
        detail: `deleted_accounts query failed (${error.message}). Skipping this guard.`,
      };
    }
    if (data && data.length > 0) {
      return {
        status: "warn" as StepStatus,
        detail: `email присутствует в deleted_accounts (${data.length} записей). Welcome-бонус для повторной регистрации этого email может не начислиться.`,
        data: { archive_rows: data.length },
      };
    }
    return { status: "ok" as StepStatus };
  });

  // ---------- 3. Create the auth user (the actual signUp pathway) ----------
  const createRes = await runStep<{ user_id: string }>("auth_admin_create_user", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      return {
        status: "fail" as StepStatus,
        detail: `auth.admin.createUser: ${error?.message ?? "no user returned"}`,
      };
    }
    createdUserId = data.user.id;
    return {
      status: "ok" as StepStatus,
      detail: `user_id=${data.user.id}`,
      data: { user_id: data.user.id },
    };
  });

  // If we couldn't create the auth user, no point continuing. Nothing to clean up.
  if (createRes.status === "fail" || !createdUserId) {
    return NextResponse.json({
      ok: false,
      email,
      user_id: createdUserId,
      total_duration_ms: Date.now() - startedAt,
      steps,
      cleanup_done: false,
    } satisfies TestReport);
  }

  const targetUserId: string = createdUserId;

  // ---------- 4. Poll for profile row created by handle_new_user trigger ----------
  await runStep<Record<string, unknown>>("trigger_profile_created", async () => {
    const t0 = Date.now();
    let lastErr: string | null = null;
    while (Date.now() - t0 < POLL_TIMEOUT_MS) {
      const { data, error } = await admin
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("id", targetUserId)
        .maybeSingle();
      if (error) {
        lastErr = error.message;
      } else if (data) {
        return {
          status: "ok" as StepStatus,
          detail: `profile created in ${Date.now() - t0} ms`,
          data,
        };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return {
      status: "fail" as StepStatus,
      detail: lastErr
        ? `profile not created within ${POLL_TIMEOUT_MS}ms (last error: ${lastErr}). Тригер handle_new_user / on_auth_user_created не сработал.`
        : `profile not created within ${POLL_TIMEOUT_MS}ms. Тригер handle_new_user / on_auth_user_created не сработал.`,
    };
  });

  // ---------- 5. Poll for token_balances row created by handle_new_profile_tokens trigger ----------
  await runStep<Record<string, unknown>>("trigger_token_balance_created", async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < POLL_TIMEOUT_MS) {
      const { data, error } = await admin
        .from("token_balances")
        .select("user_id, balance, bonus_balance, total_purchased, total_spent")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (!error && data) {
        const bonus = (data.bonus_balance as number | null) ?? 0;
        const balance = (data.balance as number | null) ?? 0;
        if (bonus !== 20 || balance !== 0) {
          return {
            status: "warn" as StepStatus,
            detail: `token_balances created but values are unexpected (balance=${balance}, bonus_balance=${bonus}; ожидалось 0/20).`,
            data,
          };
        }
        return {
          status: "ok" as StepStatus,
          detail: `token_balances created in ${Date.now() - t0} ms (balance=0, bonus=20)`,
          data,
        };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return {
      status: "fail" as StepStatus,
      detail: `token_balances not created within ${POLL_TIMEOUT_MS}ms. Тригер handle_new_profile_tokens / on_profile_created_tokens не сработал.`,
    };
  });

  // ---------- 6. Verify welcome bonus transaction was logged ----------
  await runStep<Record<string, unknown>>("welcome_bonus_transaction_logged", async () => {
    const { data, error } = await admin
      .from("token_transactions")
      .select("id, amount, type, description, created_at")
      .eq("user_id", targetUserId)
      .eq("type", "bonus")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      return {
        status: "fail" as StepStatus,
        detail: `token_transactions query: ${error.message}`,
      };
    }
    if (!data || data.length === 0) {
      return {
        status: "warn" as StepStatus,
        detail: "Welcome-бонусная транзакция не найдена. Тригер сработал, но запись в token_transactions не создалась.",
      };
    }
    const row = data[0];
    if (row.amount !== 20) {
      return {
        status: "warn" as StepStatus,
        detail: `Бонусная транзакция найдена, но amount=${row.amount} (ожидалось 20).`,
        data: row,
      };
    }
    return {
      status: "ok" as StepStatus,
      detail: `bonus transaction id=${row.id}`,
      data: row,
    };
  });

  // ---------- 7. Cleanup: delete the test auth user (cascades profile + balances) ----------
  await runStep("cleanup_delete_user", async () => {
    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) {
      return {
        status: "fail" as StepStatus,
        detail: `auth.admin.deleteUser: ${error.message}. ВНИМАНИЕ: тестовый пользователь остался в системе. Удалите вручную через "Поиск юзера".`,
      };
    }
    cleanupDone = true;

    // Also wipe any deleted_accounts archive row that the deletion might have produced,
    // so re-running the test with the same email keeps working (welcome bonus path).
    await admin.from("deleted_accounts").delete().ilike("email", email);

    return { status: "ok" as StepStatus, detail: "auth user deleted, archive cleared" };
  });

  return NextResponse.json(
    {
      ok: overallOk,
      email,
      user_id: targetUserId,
      total_duration_ms: Date.now() - startedAt,
      steps,
      cleanup_done: cleanupDone,
    } satisfies TestReport,
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
