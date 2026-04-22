"use client";

import { AlertTriangle, KeyRound, LockKeyhole, RefreshCw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TalkPortalApiError } from "@/lib/talk-portal-api";

interface ApiStatusCardProps {
  error?: TalkPortalApiError | null;
  isLoading?: boolean;
  onRetry?: () => void;
}

export function ApiStatusCard({ error, isLoading, onRetry }: ApiStatusCardProps) {
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eff4fb_46%,_#e7eef8_100%)] p-4 md:p-8">
        <Card className="w-full max-w-xl border-zinc-900/10 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">認証状態を確認しています</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-zinc-600 md:text-base">
            アクセス状態を確認しながら、トークデータを取得しています。
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!error) {
    return null;
  }

  const isPasswordRequired = error.code === "PASSWORD_REQUIRED";
  const isPasswordNotConfigured = error.code === "PASSWORD_NOT_CONFIGURED";
  const isUnauthenticated = error.code === "UNAUTHENTICATED_USER" || error.status === 401;
  const isLikelyAuthFlowIssue =
    error.code === "AUTH_REDIRECT" ||
    error.code === "BOOTSTRAP_TIMEOUT" ||
    error.code === "JSONP_TIMEOUT" ||
    error.code === "JSONP_LOAD_ERROR";
  const isClosingWriteNotConfirmed = error.code === "CLOSING_WRITE_NOT_CONFIRMED";
  const isAccessBlocked = isPasswordRequired || isPasswordNotConfigured || isUnauthenticated || isLikelyAuthFlowIssue;
  const isUnauthorized = isUnauthenticated || error.status === 403;
  const isConfigError =
    error.code === "MISSING_API_URL" ||
    error.code === "MISCONFIGURED_TALK_API_URL" ||
    isPasswordNotConfigured;

  const Icon = isPasswordRequired
    ? KeyRound
    : isUnauthorized
      ? LockKeyhole
      : isConfigError
        ? Settings
        : AlertTriangle;
  const title = isPasswordRequired
    ? "パスワード入力待ちです"
    : isPasswordNotConfigured
      ? "アクセスパスワード未設定"
    : isLikelyAuthFlowIssue
      ? "認証処理が完了していません"
    : isUnauthenticated
      ? "ユーザー情報が未取得です"
    : isClosingWriteNotConfirmed
      ? "クロージング保存が反映されていません"
    : isUnauthorized
      ? "アクセス権限がありません"
    : isConfigError
      ? "API接続先が未設定です"
      : "データの取得に失敗しました";
  const message = isPasswordRequired
    ? "画面上のパスワード入力フォームから認証してください。"
    : isPasswordNotConfigured
      ? "Apps Script の Script Properties に PORTAL_ACCESS_PASSWORD を設定してください。"
    : isLikelyAuthFlowIssue
      ? "認証フローでページ遷移が完了していない可能性があります。再読み込みして再試行してください。"
    : isUnauthenticated
      ? "メールアドレスの取得に失敗した可能性があります。必要に応じて社内メール連携を設定してください。"
    : isClosingWriteNotConfirmed
      ? "recordClosing の保存確認ができませんでした。Apps Script のデプロイを最新化し、NEXT_PUBLIC_TALK_API_URL がその /exec URL を指しているか確認してください。"
    : isUnauthorized
      ? "アクセス権限がありません。管理者へ権限付与を依頼してください。"
    : isConfigError
      ? "NEXT_PUBLIC_TALK_API_URL を正しい Talk API の /exec URL に設定して、開発サーバーを再起動してください。"
      : error.message;

  if (isAccessBlocked) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f5f7fb_0%,_#eef2f8_42%,_#e6ecf5_100%)] p-4 md:p-8">
        <Card className="w-full max-w-2xl border-zinc-900/10 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-zinc-900 md:text-2xl">
              <Icon className="size-5 text-rose-600" aria-hidden="true" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-zinc-700 md:text-base">
              パスワード認証とユーザー情報の状態を確認しています。内容を確認して再試行してください。
            </p>
            <p className="rounded-lg border border-zinc-900/10 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 md:text-sm">
              詳細: {message}
            </p>
            <div className="flex flex-wrap gap-2">
              {onRetry ? (
                <Button type="button" variant="outline" onClick={onRetry}>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  再読み込み
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden="true" />
              再読み込み
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}