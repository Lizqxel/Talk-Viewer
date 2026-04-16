"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Trash2, TriangleAlert, UserRoundPlus } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteScriptEditorPermission,
  fetchScriptEditorPermissions,
  type ScriptEditorPermission,
  upsertScriptEditorPermission,
} from "@/lib/talk-portal-api";

const defaultFormState = {
  email: "",
  canEdit: true,
  isActive: true,
  isAdmin: false,
};

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

  const [permissions, setPermissions] = useState<ScriptEditorPermission[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState(defaultFormState);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canManagePermissions = Boolean(data?.user?.isAdmin);
  const currentUserEmail = normalizeEmail(data?.user?.email ?? "");
  const normalizedFormEmail = useMemo(() => normalizeEmail(form.email), [form.email]);

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

  const emailConflict =
    normalizedFormEmail.length > 0 &&
    permissions.some((item) => item.email === normalizedFormEmail && item.email !== editingEmail);

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
        canEdit: form.canEdit,
        isActive: form.isActive,
        isAdmin: form.isAdmin,
      });

      setSaveMessage(`${result.email} の権限を更新しました。`);
      setEditingEmail(result.email);
      setForm({
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
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
          スクリプト編集権限管理
        </h1>
        <p className="text-sm text-muted-foreground">admin ユーザーのみ、Editors シートの編集権限を付与・更新できます。</p>
        <p className="text-xs text-muted-foreground">実行ユーザー: {data.user.email ?? "unknown"}</p>
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundPlus className="size-4 text-primary" aria-hidden="true" />
            {editingEmail ? `権限編集: ${editingEmail}` : "権限を付与する"}
          </CardTitle>
          <CardDescription>email / can_edit / is_active / is_admin を更新します。存在しないメールは新規追加されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
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
                    <td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">
                      {isFetching ? "取得中..." : "対象データがありません"}
                    </td>
                  </tr>
                ) : (
                  permissions.map((item) => (
                    <tr key={item.email}>
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
