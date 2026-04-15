"use client";

import { AlertTriangle, ExternalLink, LockKeyhole, RefreshCw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTalkPortalAuthorizeUrl, type TalkPortalApiError } from "@/lib/talk-portal-api";

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
            社内アカウントの認証状態を確認しながら、トークデータを取得しています。
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!error) {
    return null;
  }

  const isDomainBlocked = error.code === "FORBIDDEN_DOMAIN";
  const isUnauthenticated = error.code === "UNAUTHENTICATED_USER" || error.status === 401;
  const isLikelyUnapprovedAccount =
    error.code === "AUTH_REDIRECT" ||
    error.code === "BOOTSTRAP_TIMEOUT" ||
    error.code === "JSONP_TIMEOUT" ||
    error.code === "JSONP_LOAD_ERROR";
  const isAccountBlockedScreen = isDomainBlocked || isUnauthenticated || isLikelyUnapprovedAccount;
  const shouldShowAuthorizeLink =
    isDomainBlocked ||
    isUnauthenticated ||
    isLikelyUnapprovedAccount;
  const isUnauthorized = isDomainBlocked || isUnauthenticated || error.status === 403;
  const isConfigError = error.code === "MISSING_API_URL";
  const authorizeUrl = getTalkPortalAuthorizeUrl();

  const Icon = isUnauthorized ? LockKeyhole : isConfigError ? Settings : AlertTriangle;
  const title = isDomainBlocked
    ? "社外アカウントからはアクセスできません"
    : isLikelyUnapprovedAccount
      ? "許可されていないアカウントです"
    : isUnauthenticated
      ? "社内アカウントで認証されていません"
      : isUnauthorized
        ? "アクセス権限がありません"
    : isConfigError
      ? "API接続先が未設定です"
      : "データの取得に失敗しました";
  const message = isDomainBlocked
    ? "許可されたGoogleアカウントでログインしたユーザーのみ閲覧可能です。"
    : isLikelyUnapprovedAccount
      ? "このアカウントでは利用できません。許可済みの社内Googleアカウントに切り替えて再読み込みしてください。"
    : isUnauthenticated
      ? "Googleアカウントが認証できていません。許可されたGoogleアカウントでログインして再読み込みしてください。"
    : isUnauthorized
      ? "アクセス権限がありません。管理者へ権限付与を依頼してください。"
    : isConfigError
      ? "NEXT_PUBLIC_TALK_API_URL を設定してビルドし直してください。"
      : error.message;

  if (isAccountBlockedScreen) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f5f7fb_0%,_#eef2f8_42%,_#e6ecf5_100%)] p-4 md:p-8">
        <Card className="w-full max-w-2xl border-zinc-900/10 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-zinc-900 md:text-2xl">
              <LockKeyhole className="size-5 text-rose-600" aria-hidden="true" />
              このアカウントは許可されていません
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-zinc-700 md:text-base">
              社内で許可されたGoogleアカウントのみ、このポータルを利用できます。アカウントを切り替えるか、管理者に閲覧権限の付与をご依頼ください。
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
              {shouldShowAuthorizeLink && authorizeUrl ? (
                <Button type="button" asChild>
                  <a href={authorizeUrl} target="_self" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    認証ページを開く
                  </a>
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
          {shouldShowAuthorizeLink && authorizeUrl ? (
            <Button type="button" asChild>
              <a href={authorizeUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                認証ページを開く
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}