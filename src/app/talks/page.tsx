"use client";

import { TalksExplorer } from "@/components/talk/talks-explorer";
import { ApiFallbackNotice } from "@/components/shared/api-fallback-notice";
import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrap } from "@/hooks/use-talk-bootstrap";

export default function TalksPage() {
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrap();

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-4">
      {isFallback ? <ApiFallbackNotice onRetry={() => void reload()} reason={error?.message} /> : null}
      <TalksExplorer
        talks={data.talks}
        categories={data.talkCategories}
        tags={data.talkTags}
        productLabels={data.productLabels}
        sceneLabels={data.sceneLabels}
      />
    </div>
  );
}
