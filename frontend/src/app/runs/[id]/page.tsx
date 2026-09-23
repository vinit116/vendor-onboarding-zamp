import { RunDetailsView } from '@/components/RunDetailsView';

export default function RunDetailsPage({ params }: { params: { id: string } }) {
  return <RunDetailsView runId={params.id} />;
}
