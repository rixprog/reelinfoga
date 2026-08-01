import { Analyze } from '@/components/Analyze';
import { Page } from '@/components/Shell';

export default function AnalyzePage() {
  return (
    <Page bare>
      <div className="py-10 sm:py-14">
        <Analyze />
      </div>
    </Page>
  );
}
