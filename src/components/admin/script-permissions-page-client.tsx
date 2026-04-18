"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Trash2, TriangleAlert, UserRoundPlus } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useClosingDashboardContext } from "@/components/shared/closing-dashboard-provider";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  calculateClosingRate,
  calculatePtPerClosing,
  resolveClosingRank,
  safeDivide,
  type ClosingDashboardSnapshot,
  type ClosingRank,
} from "@/lib/closing-metrics";
import {
  deleteScriptEditorPermission,
  fetchClosingDashboardByApi,
  fetchScriptEditorPermissions,
  type ScriptEditorPermission,
  upsertScriptEditorPermission,
} from "@/lib/talk-portal-api";
import { cn } from "@/lib/utils";

const defaultFormState = {
  name: "",
  email: "",
  canEdit: true,
  isActive: true,
  isAdmin: false,
};

type MemberClosingState = {
  snapshot: ClosingDashboardSnapshot | null;
  error: string | null;
};

type MemberClosingRow = {
  email: string;
  name?: string;
  canEdit: boolean;
  isActive: boolean;
  isAdmin: boolean;
  isCurrentUser: boolean;
  snapshot: ClosingDashboardSnapshot | null;
  error: string | null;
  todayAcquiredPt: number;
  todayClosingCount: number;
  todayDialogCount: number;
  monthlyClosingCount: number;
  ptPerClosing: number;
  closingRate: number;
  rank: ClosingRank;
  lastClosingAt: string | null;
};

const pointFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 1,
});

function formatPoint(value: number) {
  return `${pointFormatter.format(value)}pt`;
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLastClosingAt(value: string | null) {
  if (!value) {
    return "未記録";
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  });
}

function formatMemberLabel(name: string | undefined, email: string) {
  const normalizedName = String(name ?? "").trim();
  return normalizedName ? `${normalizedName} (${email})` : email;
}

function rankBadgeClassName(rank: ClosingRank) {
  if (rank === "S") {
    return "border-amber-500 bg-amber-500/90 text-amber-950";
  }

  if (rank === "A") {
    return "border-emerald-600 bg-emerald-600 text-emerald-50";
  }

  if (rank === "B") {
    return "border-sky-600 bg-sky-600 text-sky-50";
  }

  if (rank === "C") {
    return "border-indigo-500 bg-indigo-500 text-indigo-50";
  }

  return "border-slate-500 bg-slate-500 text-slate-50";
}

function getFailureMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ScriptPermissionsPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();
  const { adminAlerts } = useClosingDashboardContext();

  const [permissions, setPermissions] = useState<ScriptEditorPermission[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState(defaultFormState);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [memberClosingMap, setMemberClosingMap] = useState<Record<string, MemberClosingState>>({});
  const [isFetchingMemberClosings, setIsFetchingMemberClosings] = useState(false);
  const [memberClosingsError, setMemberClosingsError] = useState<string | null>(null);

  const canManagePermissions = Boolean(data?.user?.isAdmin);
  const currentUserEmail = normalizeEmail(data?.user?.email ?? "");
  const normalizedFormEmail = useMemo(() => normalizeEmail(form.email), [form.email]);

  const closingTargets = useMemo(() => {
    const seenEmails = new Set<string>();
    const targets: ScriptEditorPermission[] = [];

    for (const item of permissions) {
      const normalizedEmail = normalizeEmail(item.email);
      const normalizedName = String(item.name ?? "").trim();
      if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
        continue;
      }

      seenEmails.add(normalizedEmail);
      targets.push({
        ...item,
        email: normalizedEmail,
        name: normalizedName || undefined,
      });
    }

    return targets;
  }, [permissions]);

  const loadPermissions = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);

    try {
      const rows = await fetchScriptEditorPermissions();
      setPermissions(rows);
    } catch (caught) {
      setFetchError(getFailureMessage(caught));
      setPermissions([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!canManagePermissions) {
      return;
    }

    void loadPermissions();
  }, [canManagePermissions, loadPermissions]);

  const loadMemberClosings = useCallback(async (targets: ScriptEditorPermission[]) => {
    const targetEmails = targets
      .map((item) => normalizeEmail(item.email))
      .filter((email, index, array) => Boolean(email) && array.indexOf(email) === index);

    if (targetEmails.length === 0) {
      setMemberClosingMap({});
      setMemberClosingsError(null);
      return;
    }

    setIsFetchingMemberClosings(true);
    setMemberClosingsError(null);

    try {
      const resolved = await Promise.all(
        targetEmails.map(async (email) => {
          try {
            const snapshot = await fetchClosingDashboardByApi({ email });
            return {
              email,
              snapshot,
              error: null as string | null,
            };
          } catch (caught) {
            return {
              email,
              snapshot: null as ClosingDashboardSnapshot | null,
              error: getFailureMessage(caught),
            };
          }
        }),
      );

      const nextMap: Record<string, MemberClosingState> = {};
      let failedCount = 0;

      for (const item of resolved) {
        nextMap[item.email] = {
          snapshot: item.snapshot,
          error: item.error,
        };

        if (item.error) {
          failedCount += 1;
        }
      }

      setMemberClosingMap(nextMap);

      if (failedCount > 0) {
        setMemberClosingsError(
          `${failedCount}名のクロージング指標を取得できませんでした。認証状態と Apps Script の権限を確認してください。`,
        );
      } else {
        setMemberClosingsError(null);
      }
    } finally {
      setIsFetchingMemberClosings(false);
    }
  }, []);

  useEffect(() => {
    if (!canManagePermissions) {
      return;
    }

    void loadMemberClosings(closingTargets);
  }, [canManagePermissions, closingTargets, loadMemberClosings]);

  const emailConflict =
    normalizedFormEmail.length > 0 &&
    permissions.some((item) => item.email === normalizedFormEmail && item.email !== editingEmail);

  const memberClosingRows = useMemo<MemberClosingRow[]>(() => {
    return closingTargets
      .map((target) => {
        const normalizedEmail = normalizeEmail(target.email);
        const state = memberClosingMap[normalizedEmail];
        const snapshot = state?.snapshot ?? null;

        const todayAcquiredPt = snapshot?.todayAcquiredPt ?? 0;
        const todayClosingCount = snapshot?.todayClosingCount ?? 0;
        const todayDialogCount = snapshot?.todayDialogCount ?? 0;
        const monthlyClosingCount = snapshot?.monthlyClosingCount ?? 0;
        const ptPerClosing = snapshot ? calculatePtPerClosing(snapshot) : 0;
        const closingRate = snapshot ? calculateClosingRate(snapshot) : 0;

        return {
          email: normalizedEmail,
          name: target.name,
          canEdit: target.canEdit,
          isActive: target.isActive,
          isAdmin: target.isAdmin,
          isCurrentUser: normalizedEmail === currentUserEmail,
          snapshot,
          error: state?.error ?? null,
          todayAcquiredPt,
          todayClosingCount,
          todayDialogCount,
          monthlyClosingCount,
          ptPerClosing,
          closingRate,
          rank: resolveClosingRank(ptPerClosing),
          lastClosingAt: snapshot?.lastClosingAt ?? null,
        };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }

        if (b.todayAcquiredPt !== a.todayAcquiredPt) {
          return b.todayAcquiredPt - a.todayAcquiredPt;
        }

        if (b.todayClosingCount !== a.todayClosingCount) {
          return b.todayClosingCount - a.todayClosingCount;
        }

        const aLabel = formatMemberLabel(a.name, a.email);
        const bLabel = formatMemberLabel(b.name, b.email);

        if (aLabel !== bLabel) {
          return aLabel.localeCompare(bLabel);
        }

        return a.email.localeCompare(b.email);
      });
  }, [closingTargets, currentUserEmail, memberClosingMap]);

  const closingOverview = useMemo(() => {
    const loadedRows = memberClosingRows.filter((item) => item.snapshot && !item.error);

    const totalAcquiredPt = loadedRows.reduce((sum, item) => sum + item.todayAcquiredPt, 0);
    const totalTodayClosing = loadedRows.reduce((sum, item) => sum + item.todayClosingCount, 0);
    const averagePtPerClosing = safeDivide(totalAcquiredPt, totalTodayClosing);

    return {
      totalMembers: memberClosingRows.length,
      loadedMembers: loadedRows.length,
      totalAcquiredPt,
      totalTodayClosing,
      averagePtPerClosing,
    };
  }, [memberClosingRows]);

  const topPerformers = useMemo(
    () => memberClosingRows.filter((item) => item.snapshot && !item.error).slice(0, 3),
    [memberClosingRows],
  );

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  if (!data.user?.isAdmin) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            管理者権限がありません
          </CardTitle>
          <CardDescription>このタブは admin ユーザーのみ表示されます。Editors シートで is_admin を TRUE に設定してください。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaveError(null);
    setSaveMessage(null);

    if (!normalizedFormEmail) {
      setSaveError("メールアドレスを入力してください。");
      return;
    }

    if (!isValidEmail(normalizedFormEmail)) {
      setSaveError("有効なメールアドレス形式で入力してください。");
      return;
    }

    setIsSaving(true);

    try {
      const result = await upsertScriptEditorPermission({
        email: normalizedFormEmail,
        name: form.name.trim(),
        canEdit: form.canEdit,
        isActive: form.isActive,
        isAdmin: form.isAdmin,
      });

      setSaveMessage(`${formatMemberLabel(result.name, result.email)} の権限を更新しました。`);
      setEditingEmail(result.email);
      setForm({
        name: result.name ?? "",
        email: result.email,
        canEdit: result.canEdit,
        isActive: result.isActive,
        isAdmin: result.isAdmin,
      });

      await loadPermissions();
    } catch (caught) {
      setSaveError(getFailureMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item: ScriptEditorPermission) => {
    setEditingEmail(item.email);
    setForm({
      name: item.name ?? "",
      email: item.email,
      canEdit: item.canEdit,
      isActive: item.isActive,
      isAdmin: item.isAdmin,
    });
    setSaveError(null);
    setSaveMessage(null);
  };

  const resetForm = () => {
    setEditingEmail(null);
    setForm(defaultFormState);
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleDelete = async (targetEmail: string) => {
    const normalizedTargetEmail = normalizeEmail(targetEmail);
    if (!normalizedTargetEmail) {
      return;
    }

    const selfDeleteWarning =
      normalizedTargetEmail === currentUserEmail
        ? "現在ログイン中の管理者アカウントです。削除するとこの画面に再アクセスできなくなる可能性があります。"
        : "";

    const confirmed = window.confirm(
      `${normalizedTargetEmail} の編集権限を削除しますか？\n${selfDeleteWarning}`.trim(),
    );
    if (!confirmed) {
      return;
    }

    setDeletingEmail(normalizedTargetEmail);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const result = await deleteScriptEditorPermission(normalizedTargetEmail);
      setSaveMessage(`${result.email} の編集権限を削除しました。`);

      if (editingEmail === result.email) {
        resetForm();
      }

      await loadPermissions();
    } catch (caught) {
      setSaveError(getFailureMessage(caught));
    } finally {
      setDeletingEmail(null);
    }
  };

  return (
    <div className="space-y-6">
      {adminAlerts.length > 0 ? (
        <Card className="border-destructive/35 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              15分未稼働アラート
            </CardTitle>
            <CardDescription className="text-destructive/90">
              クロージング回数の増加が止まっているAPです。フォローを検討してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-destructive">
              {adminAlerts.map((item) => (
                <li key={item.userEmail}>
                  {item.userName ? `${item.userName} (${item.userEmail})` : item.userEmail} : {item.minutesWithoutClosing.toFixed(0)}分
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
          スクリプト編集権限管理
        </h1>
        <p className="text-sm text-muted-foreground">admin ユーザーのみ、Editors シートの編集権限を付与・更新できます。</p>
        <p className="text-xs text-muted-foreground">実行ユーザー: {formatMemberLabel(data.user?.name, data.user.email ?? "unknown")}</p>
      </div>

      <Card className="border-border/80 bg-gradient-to-br from-emerald-50/70 via-background to-sky-50/60">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">メンバー別クロージングポイント</CardTitle>
              <CardDescription>
                管理者向けに、各メンバーの本日獲得PT・クロージング数・単価を一覧表示します。
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadMemberClosings(closingTargets)}
              disabled={isFetchingMemberClosings || isFetching}
            >
              {isFetchingMemberClosings ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              指標を再取得
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">対象メンバー</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{closingOverview.totalMembers}名</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">本日クロージング合計</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{closingOverview.totalTodayClosing.toLocaleString("ja-JP")}回</p>
              <p className="text-[11px] text-muted-foreground">
                取得成功: {closingOverview.loadedMembers}/{closingOverview.totalMembers}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">本日獲得PT合計</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{formatPoint(closingOverview.totalAcquiredPt)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">平均クロージング単価</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{closingOverview.averagePtPerClosing.toFixed(2)}</p>
            </div>
          </div>

          {memberClosingsError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {memberClosingsError}
            </p>
          ) : null}

          {isFetchingMemberClosings ? (
            <p className="text-xs text-muted-foreground">クロージング指標を取得しています...</p>
          ) : null}

          {topPerformers.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">本日の上位メンバー</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topPerformers.map((item, index) => (
                  <Badge key={item.email} variant="secondary" className="border border-border/60 bg-background px-2.5 py-1 text-xs">
                    #{index + 1} {formatMemberLabel(item.name, item.email)} / {formatPoint(item.todayAcquiredPt)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {memberClosingRows.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                表示対象メンバーがありません。Editors シートにユーザーを追加してください。
              </div>
            ) : (
              memberClosingRows.map((item) => (
                <article
                  key={item.email}
                  className={cn(
                    "rounded-xl border border-border/70 bg-background/90 p-4 shadow-sm",
                    item.isCurrentUser ? "border-primary/40 bg-primary/[0.06]" : null,
                    !item.isActive ? "opacity-70" : null,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.name ?? item.email}</p>
                      {item.name ? <p className="truncate text-[11px] text-muted-foreground">{item.email}</p> : null}
                      <p className="text-xs text-muted-foreground">
                        {[item.isCurrentUser ? "あなた" : null, item.isAdmin ? "管理者" : item.canEdit ? "編集者" : "閲覧者", item.isActive ? "有効" : "無効"]
                          .filter((value): value is string => Boolean(value))
                          .join(" / ")}
                      </p>
                    </div>
                    <Badge className={cn("border px-2 py-0.5 text-xs font-semibold", rankBadgeClassName(item.rank))}>
                      {item.rank}
                    </Badge>
                  </div>

                  {item.error ? (
                    <p className="mt-3 text-xs text-destructive">{item.error}</p>
                  ) : (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">本日獲得PT</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{formatPoint(item.todayAcquiredPt)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">本日クロージング</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{item.todayClosingCount.toLocaleString("ja-JP")}回</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">単価</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{item.ptPerClosing.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">全件率</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{formatRate(item.closingRate)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">対話件数</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{item.todayDialogCount.toLocaleString("ja-JP")}件</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground">月間累計</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight">{item.monthlyClosingCount.toLocaleString("ja-JP")}回</p>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        最終クロージング: {formatLastClosingAt(item.lastClosingAt)}
                      </p>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundPlus className="size-4 text-primary" aria-hidden="true" />
            {editingEmail
              ? `権限編集: ${formatMemberLabel(
                permissions.find((item) => item.email === editingEmail)?.name,
                editingEmail,
              )}`
              : "権限を付与する"}
          </CardTitle>
          <CardDescription>name / email / can_edit / is_active / is_admin を更新します。存在しないメールは新規追加されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <label htmlFor="editor-name" className="text-xs font-medium text-muted-foreground">
                表示名
              </label>
              <Input
                id="editor-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例: 山田 太郎"
                disabled={isSaving || Boolean(deletingEmail)}
                className="max-w-md"
              />
              <p className="text-[11px] text-muted-foreground">未入力の場合はメールアドレスを表示します。</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="editor-email" className="text-xs font-medium text-muted-foreground">
                メールアドレス
              </label>
              <Input
                id="editor-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="example@bb-connection.com"
                disabled={isSaving || Boolean(deletingEmail)}
                className="max-w-md"
              />
              {emailConflict ? <p className="text-xs text-amber-700">同じメールが既に存在します。更新の場合はそのまま保存してください。</p> : null}
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.canEdit}
                  onChange={(event) => setForm((prev) => ({ ...prev, canEdit: event.target.checked }))}
                  disabled={isSaving || Boolean(deletingEmail)}
                />
                can_edit
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  disabled={isSaving || Boolean(deletingEmail)}
                />
                is_active
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={form.isAdmin}
                  onChange={(event) => setForm((prev) => ({ ...prev, isAdmin: event.target.checked }))}
                  disabled={isSaving || Boolean(deletingEmail)}
                />
                is_admin
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isSaving || Boolean(deletingEmail)}>
                {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                保存
              </Button>
              <Button type="button" variant="outline" disabled={isSaving || Boolean(deletingEmail)} onClick={resetForm}>
                入力をクリア
              </Button>
            </div>

            {saveMessage ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {saveMessage}
              </p>
            ) : null}

            {saveError ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                {saveError}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">現在の編集権限一覧</CardTitle>
              <CardDescription>Apps Script から取得した Editors 一覧です。編集・削除ができます。</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadPermissions()} disabled={isFetching || Boolean(deletingEmail)}>
              {isFetching ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              再取得
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fetchError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {fetchError}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">名前</th>
                  <th className="px-3 py-2 font-medium">email</th>
                  <th className="px-3 py-2 font-medium">編集</th>
                  <th className="px-3 py-2 font-medium">有効</th>
                  <th className="px-3 py-2 font-medium">admin</th>
                  <th className="px-3 py-2 font-medium">更新日時</th>
                  <th className="px-3 py-2 font-medium">更新者</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-5 text-center text-muted-foreground">
                      {isFetching ? "取得中..." : "対象データがありません"}
                    </td>
                  </tr>
                ) : (
                  permissions.map((item) => (
                    <tr key={item.email}>
                      <td className="px-3 py-2 text-xs text-foreground">{item.name?.trim() || "-"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground">{item.email}</td>
                      <td className="px-3 py-2">
                        <Badge variant={item.canEdit ? "secondary" : "outline"}>{item.canEdit ? "TRUE" : "FALSE"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={item.isActive ? "secondary" : "outline"}>{item.isActive ? "TRUE" : "FALSE"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={item.isAdmin ? "default" : "outline"}>{item.isAdmin ? "TRUE" : "FALSE"}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{item.updatedAt ?? "-"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{item.updatedBy ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            disabled={isSaving || Boolean(deletingEmail)}
                          >
                            編集
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(item.email)}
                            disabled={isSaving || Boolean(deletingEmail)}
                          >
                            {deletingEmail === item.email ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="size-4" aria-hidden="true" />
                            )}
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
